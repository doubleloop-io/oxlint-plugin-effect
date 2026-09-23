import { defineRule } from "@oxlint/plugins"

import { isInsideEffectGeneratorBody, memberOf } from "../shared/effect-ast.ts"

// mapError, orElse and orElseSucceed stay allowed: they name a failure or give an alternative
// without opening a handling branch inside the success path.
const errorHandlers = new Set([
    "catch",
    "catchAll",
    "catchCause",
    "catchCauseFilter",
    "catchCauseIf",
    "catchDefect",
    "catchEager",
    "catchFilter",
    "catchIf",
    "catchReason",
    "catchReasons",
    "catchTag",
    "catchTags",
    "either",
    "exit",
    "match",
    "matchCause",
    "matchCauseEffect",
    "matchEffect",
    "result",
    "sandbox",
])

export const errorHandlingInEffectFnHandlerRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Keep only the success path in Effect generators and handle errors in the second argument of `Effect.fn`.",
        },
        messages: {
            handlerInGenerator:
                "Move `Effect.{{name}}` out of the generator: keep the success path in the body and handle errors in the pipeable arguments of `Effect.fn`.",
        },
    },
    createOnce(context) {
        return {
            MemberExpression(node) {
                const name = memberOf(node, "Effect")
                if (
                    name === undefined ||
                    !errorHandlers.has(name) ||
                    !isInsideEffectGeneratorBody(node)
                ) {
                    return
                }
                context.report({ node, messageId: "handlerInGenerator", data: { name } })
            },
        }
    },
})
