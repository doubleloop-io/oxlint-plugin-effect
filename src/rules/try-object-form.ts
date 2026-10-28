import { defineRule } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"

const tryConstructors = new Set(["try", "tryPromise"])

export const tryObjectFormRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Use the object form of `Effect.try` and `Effect.tryPromise`, mapping failures to tagged errors.",
        },
        messages: {
            objectForm:
                "Use `Effect.{{name}}({ try, catch })`: the thunk form types the failure as `Cause.UnknownError`.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                const name = calleeOf(node, "Effect")
                if (name === undefined || !tryConstructors.has(name)) return
                if (node.arguments[0]?.type !== "ObjectExpression") {
                    context.report({ node, messageId: "objectForm", data: { name } })
                }
            },
        }
    },
})
