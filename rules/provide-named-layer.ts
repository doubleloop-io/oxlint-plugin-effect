import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"
import { filePatternsSchema } from "../shared/file-globs.ts"
import { isTestFile } from "../shared/test-files.ts"

const matchers = new Set(["match", "$match"])

// Factories and module members (`planLayer(csv)`, `CsvSheetReader.layer(path)`) are names;
// only composition written in the argument itself is reported.
const isInlineComposition = (layer: ESTree.Node | undefined): layer is ESTree.Node => {
    if (layer?.type === "ConditionalExpression" || layer?.type === "LogicalExpression") return true
    if (layer?.type !== "CallExpression" || layer.callee.type !== "MemberExpression") return false
    const { callee } = layer
    if (callee.object.type === "Identifier" && callee.object.name === "Layer") return true
    return (
        !callee.computed &&
        callee.property.type === "Identifier" &&
        matchers.has(callee.property.name)
    )
}

export const provideNamedLayerRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Provide named layers instead of composing them inside `Effect.provide`. Test files are skipped.",
        },
        messages: {
            inlineLayer:
                "Name the layer passed to `Effect.provide` (`const appLayer = Layer.mergeAll(...)`) instead of composing it inline.",
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
            // Tests build per-test fakes inline, which is the idiomatic form there.
            before() {
                inTestFile = isTestFile(context)
            },
            CallExpression(node) {
                if (inTestFile || calleeOf(node, "Effect") !== "provide") return
                // Data-first `Effect.provide(effect, layer)` and data-last `Effect.provide(layer)`.
                const layer = node.arguments.at(-1)
                if (isInlineComposition(layer)) {
                    context.report({ node: layer, messageId: "inlineLayer" })
                }
            },
        }
    },
})
