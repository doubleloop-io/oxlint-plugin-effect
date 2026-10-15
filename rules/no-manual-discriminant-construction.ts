import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"
import {
    configuredDiscriminants,
    discriminantsSchema,
    isStringLiteral,
    propertyName,
} from "../shared/tagged-values.ts"

export const remedyFor = (discriminant: string) =>
    discriminant === "_tag"
        ? "the Schema's tagged `.make`, the tagged class or error constructor, or the `Data.taggedEnum` variant constructor"
        : "the Schema's `.make` or the class constructor"

const isMatchPatternCall = (call: ESTree.CallExpression) => {
    const method = calleeOf(call, "Match")
    return method === "when" || method === "not"
}

// `match(value).with(pattern, handler)`, also after earlier `.with`/`.when` links of the chain.
const isTsPatternWithCall = (call: ESTree.CallExpression) => {
    if (
        call.callee.type !== "MemberExpression" ||
        call.callee.computed ||
        call.callee.property.type !== "Identifier" ||
        call.callee.property.name !== "with"
    ) {
        return false
    }
    let link: ESTree.Node = call.callee.object
    while (link.type === "CallExpression" && link.callee.type === "MemberExpression") {
        link = link.callee.object
    }
    return (
        link.type === "CallExpression" &&
        link.callee.type === "Identifier" &&
        link.callee.name === "match"
    )
}

// `Schema.decodeUnknownSync(X)(input)`: the literal is raw data to validate, not a value of X.
const isSchemaCodecApplication = (call: ESTree.CallExpression) => {
    const method = calleeOf(call.callee, "Schema")
    return method !== undefined && (method.startsWith("decode") || method.startsWith("encode"))
}

// A literal nested in a pattern or in a codec input belongs to it as much as the outermost one.
const isPatternOrCodecInput = (node: ESTree.ObjectExpression) => {
    let child: ESTree.Node = node
    let current = node.parent
    while (
        current?.type === "Property" ||
        current?.type === "ObjectExpression" ||
        current?.type === "ArrayExpression"
    ) {
        child = current
        current = current.parent
    }
    return (
        current?.type === "CallExpression" &&
        current.arguments.some((argument) => argument === child) &&
        (isMatchPatternCall(current) ||
            isTsPatternWithCall(current) ||
            isSchemaCodecApplication(current))
    )
}

export const noManualDiscriminantConstructionRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Construct a union's variants with their constructor, not as object literals with the discriminant.",
        },
        messages: {
            manualConstruction:
                "An object literal with a literal `{{discriminant}}` skips the variant's constructor: use {{remedy}}.",
        },
        schema: [
            {
                type: "object",
                properties: { discriminants: discriminantsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let discriminants = new Set<string>()

        return {
            before() {
                discriminants = configuredDiscriminants(context.options)
            },
            ObjectExpression(node) {
                for (const property of node.properties) {
                    if (property.type !== "Property" || !isStringLiteral(property.value)) continue
                    const discriminant = propertyName(property)
                    if (discriminant === undefined || !discriminants.has(discriminant)) continue
                    if (isPatternOrCodecInput(node)) return
                    context.report({
                        node: property,
                        messageId: "manualConstruction",
                        data: { discriminant, remedy: remedyFor(discriminant) },
                    })
                    return
                }
            },
        }
    },
})
