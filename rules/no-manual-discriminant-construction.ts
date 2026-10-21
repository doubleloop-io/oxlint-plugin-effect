import { defineRule, type ESTree, type Scope, type SourceCode } from "@oxlint/plugins"

import { calleeOf, isFunctionNode } from "../shared/effect-ast.ts"
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

// `expect(x).toMatchObject(…)`, `expect(x).not.toEqual(…)`, `expect.objectContaining(…)`: the
// literal describes the expected shape, and a partial match has no constructor to call.
const isAssertionExpectation = (call: ESTree.CallExpression) => {
    if (call.callee.type !== "MemberExpression") return false
    let link: ESTree.Node = call.callee
    while (link.type === "MemberExpression" || link.type === "CallExpression") {
        link = link.type === "MemberExpression" ? link.object : link.callee
    }
    return link.type === "Identifier" && link.name === "expect"
}

// `JSON.stringify({ _tag: "NotReady" })`: the literal is the serialized form, which no constructor builds.
const isJsonSerialization = (call: ESTree.CallExpression) => calleeOf(call, "JSON") === "stringify"

const declaredFunction = (name: string, scope: Scope | null) => {
    for (let current = scope; current; current = current.upper) {
        const definition = current.set.get(name)?.defs[0]
        if (definition === undefined) continue
        const declared =
            definition.node.type === "VariableDeclarator" ? definition.node.init : definition.node
        return isFunctionNode(declared) ? declared : undefined
    }
    return undefined
}

// `readinessAgainst(503, { _tag: "NotReady" })` with `readinessAgainst` declared in the file as
// `(status: number, body: unknown) => …`: the author declared the argument raw data, such as the
// body a fake HTTP server answers with. Without types, a function imported from elsewhere is not seen.
const isUnknownArgument = (
    call: ESTree.CallExpression,
    argument: ESTree.Node,
    sourceCode: SourceCode,
) => {
    if (call.callee.type !== "Identifier") return false
    const index = call.arguments.findIndex((candidate) => candidate === argument)
    if (call.arguments.slice(0, index).some((candidate) => candidate.type === "SpreadElement")) {
        return false
    }
    const fn = declaredFunction(call.callee.name, sourceCode.getScope(call))
    const parameter = fn?.params[index]
    const binding = parameter?.type === "AssignmentPattern" ? parameter.left : parameter
    return (
        binding?.type === "Identifier" &&
        binding.typeAnnotation?.typeAnnotation.type === "TSUnknownKeyword"
    )
}

// A literal nested in a pattern, in an expectation or in raw input belongs to it as much as the outermost one.
const isPatternExpectationOrRawInput = (node: ESTree.ObjectExpression, sourceCode: SourceCode) => {
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
            isAssertionExpectation(current) ||
            isSchemaCodecApplication(current) ||
            isJsonSerialization(current) ||
            isUnknownArgument(current, child, sourceCode))
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
                    if (isPatternExpectationOrRawInput(node, context.sourceCode)) return
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
