import type { ESTree } from "@oxlint/plugins"

import { calleeOf } from "./effect-ast.ts"

const equalityOperators = new Set(["==", "===", "!=", "!=="])
const broadEffectCatchMethods = new Set(["catch", "catchAll", "catchIf"])

export const isEqualityComparison = (node: ESTree.Node): node is ESTree.BinaryExpression =>
    node.type === "BinaryExpression" && equalityOperators.has(node.operator)

export const isStringLiteral = (
    node: ESTree.Node | null | undefined,
): node is ESTree.StringLiteral => node?.type === "Literal" && typeof node.value === "string"

const isPropertyNamed = (node: ESTree.MemberExpression, name: string) =>
    node.computed
        ? isStringLiteral(node.property) && node.property.value === name
        : node.property.type === "Identifier" && node.property.name === name

export const isTagMember = (
    node: ESTree.Node | null | undefined,
): node is ESTree.MemberExpression =>
    node?.type === "MemberExpression" && isPropertyNamed(node, "_tag")

export const isReasonTagMember = (node: ESTree.MemberExpression) =>
    node.object.type === "MemberExpression" && isPropertyNamed(node.object, "reason")

export const tagMemberFromComparison = (node: ESTree.BinaryExpression) => {
    if (!isEqualityComparison(node)) return undefined
    if (isTagMember(node.left) && isStringLiteral(node.right)) return node.left
    if (isTagMember(node.right) && isStringLiteral(node.left)) return node.right
    return undefined
}

// Only the nearest function counts: a `_tag` check in a callback nested inside the handler
// is not the handler discriminating its error.
export const isInsideBroadEffectHandler = (node: ESTree.Node) => {
    for (let current: ESTree.Node | null = node.parent; current; current = current.parent) {
        if (current.type === "ArrowFunctionExpression" || current.type === "FunctionExpression") {
            const call = current.parent
            return (
                call?.type === "CallExpression" &&
                broadEffectCatchMethods.has(calleeOf(call, "Effect") ?? "") &&
                call.arguments.some((argument) => argument === current)
            )
        }
    }
    return false
}

export const propertyName = (property: ESTree.ObjectProperty) => {
    if (!property.computed && property.key.type === "Identifier") return property.key.name
    if (isStringLiteral(property.key)) return property.key.value
    return undefined
}

export const isMatchPatternObject = (node: ESTree.ObjectExpression) => {
    const call = node.parent
    if (call?.type !== "CallExpression" || !call.arguments.some((argument) => argument === node)) {
        return false
    }
    const method = calleeOf(call, "Match")
    return method === "when" || method === "not"
}
