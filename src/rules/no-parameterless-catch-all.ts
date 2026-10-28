import { defineRule } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"

const catchAlls = new Set(["catch", "catchAll", "catchCause", "catchEager"])

export const noParameterlessCatchAllRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description: "Forbid catch-all handlers that ignore the error they catch.",
        },
        messages: {
            swallowed:
                "`Effect.{{name}}` ignores what it catches, so it also swallows failures added later: use `Effect.catchTag`, or `Effect.orElseSucceed`/`Effect.orElse` when every failure truly means the same fallback.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                const name = calleeOf(node, "Effect")
                if (name === undefined || !catchAlls.has(name)) return
                const handler = node.arguments.at(-1)
                if (
                    (handler?.type === "ArrowFunctionExpression" ||
                        handler?.type === "FunctionExpression") &&
                    handler.params.length === 0
                ) {
                    context.report({ node: handler, messageId: "swallowed", data: { name } })
                }
            },
        }
    },
})
