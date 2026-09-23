import { defineRule } from "@oxlint/plugins"

import { calleeOf, isEffectGenerator, nearestFunction } from "../shared/effect-ast.ts"

// Only the two forms the effecttsgo preset misses: `Effect.fail(new Error(…))` and
// `extends Error` are already reported by global-error-in-effect-failure and extends-native-error.
export const noBareErrorInEffectRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Fail Effects with tagged errors, never with a `throw` or a primitive value.",
        },
        messages: {
            throwInGenerator:
                "A `throw` inside an Effect generator becomes a defect: `return yield* new TaggedError(...)` instead.",
            primitiveFailure:
                "Fail with a tagged error (`Data.TaggedError` or `Schema.TaggedError`), not a primitive value.",
        },
    },
    createOnce(context) {
        return {
            ThrowStatement(node) {
                const fn = nearestFunction(node)
                if (fn !== undefined && isEffectGenerator(fn)) {
                    context.report({ node, messageId: "throwInGenerator" })
                }
            },
            CallExpression(node) {
                if (calleeOf(node, "Effect") !== "fail") return
                const [failure] = node.arguments
                if (failure?.type === "Literal" || failure?.type === "TemplateLiteral") {
                    context.report({ node: failure, messageId: "primitiveFailure" })
                }
            },
        }
    },
})
