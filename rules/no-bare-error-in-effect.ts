import { defineRule } from "@oxlint/plugins"

import { calleeOf, isEffectGenerator, nearestFunction } from "../shared/effect-ast.ts"
import { filePatternsSchema } from "../shared/file-globs.ts"
import { isTestFile } from "../shared/test-files.ts"

// Only the two forms the effecttsgo preset misses: `Effect.fail(new Error(…))` and
// `extends Error` are already reported by global-error-in-effect-failure and extends-native-error.
export const noBareErrorInEffectRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Fail Effects with tagged errors, never with a `throw` or a primitive value. Primitive failures in test files are allowed.",
        },
        messages: {
            throwInGenerator:
                "A `throw` inside an Effect generator becomes a defect: `return yield* new TaggedError(...)` instead.",
            primitiveFailure:
                "Fail with a tagged error (`Data.TaggedError` or `Schema.TaggedError`), not a primitive value.",
        },
        schema: [
            {
                type: "object",
                properties: { testFiles: filePatternsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let inTestFile = false

        return {
            // A test's synthetic failure (`Effect.fail("boom")`) feeds code generic over the error,
            // which never discriminates it; a `throw` is still a defect there.
            before() {
                inTestFile = isTestFile(context)
            },
            ThrowStatement(node) {
                const fn = nearestFunction(node)
                if (fn !== undefined && isEffectGenerator(fn)) {
                    context.report({ node, messageId: "throwInGenerator" })
                }
            },
            CallExpression(node) {
                if (inTestFile || calleeOf(node, "Effect") !== "fail") return
                const [failure] = node.arguments
                if (failure?.type === "Literal" || failure?.type === "TemplateLiteral") {
                    context.report({ node: failure, messageId: "primitiveFailure" })
                }
            },
        }
    },
})
