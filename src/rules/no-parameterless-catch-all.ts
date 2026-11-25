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
                "`Effect.{{name}}` ignores what it catches, so it also swallows failures added later. Decide per failure of the error type: catch by tag (`Effect.catchTag`) only the failures the fallback is meant for, and let the others reach the caller. If the fallback is meant for any failure, including future ones (such as an optional source), say so with `Effect.orElse`/`Effect.orElseSucceed`.",
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
