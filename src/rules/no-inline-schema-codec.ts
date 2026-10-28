import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, nearestFunction, type FunctionNode } from "../shared/effect-ast.ts"

// Only the codec factories: `Schema.decode`, `decodeTo`, `encodeKeys`, … build schemas.
const codecFactory = /^(decode|encode)(Unknown)?(Effect|Exit|Option|Promise|Result|Sync)$/

const layerConstructors = new Set(["effect", "scoped"])

const isLayerConstructor = (node: ESTree.Node) => {
    const name = calleeOf(node, "Layer")
    return name !== undefined && layerConstructors.has(name)
}

// `Layer.effect(T, Effect.gen(…))` and the curried `Layer.effect(T)(Effect.gen(…))`: the
// generator runs once, when the Layer is built.
const isLayerConstructionGenerator = (fn: FunctionNode) => {
    const gen = fn.parent
    if (!fn.generator || gen?.type !== "CallExpression" || calleeOf(gen, "Effect") !== "gen") {
        return false
    }
    const layer = gen.parent
    if (layer?.type !== "CallExpression" || !layer.arguments.some((arg) => arg === gen)) {
        return false
    }
    return isLayerConstructor(layer) || isLayerConstructor(layer.callee)
}

export const noInlineSchemaCodecRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Extract `Schema.decode*`/`Schema.encode*` codecs into module-level constants instead of applying them inline.",
        },
        messages: {
            inlineCodec:
                "`Schema.{{factory}}(…)` is built and applied inline: extract it into a named module-level constant.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                const factory = calleeOf(node.callee, "Schema")
                if (factory === undefined || !codecFactory.test(factory)) return
                const fn = nearestFunction(node)
                if (fn === undefined || isLayerConstructionGenerator(fn)) return
                context.report({ node: node.callee, messageId: "inlineCodec", data: { factory } })
            },
        }
    },
})
