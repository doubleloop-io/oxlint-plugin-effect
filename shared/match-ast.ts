import type { ESTree } from "@oxlint/plugins"

import { calleeOf, memberOf } from "./effect-ast.ts"

const modulesWithMatch = ["Option", "Result", "Exit", "Either"]

export const isMatchCall = (
    node: ESTree.Node | null | undefined,
): node is ESTree.CallExpression => {
    if (node?.type !== "CallExpression") return false
    const { callee } = node
    if (modulesWithMatch.some((module) => memberOf(callee, module) === "match")) return true
    if (memberOf(callee, "Match") === "valueTags") return true
    return (
        callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        callee.property.name === "$match"
    )
}

const isMatchStart = (node: ESTree.Node | null | undefined) => {
    const start = calleeOf(node, "Match")
    return start === "value" || start === "type"
}

// `Match.value(x).pipe(...)`, the data-last `Match.type().pipe(...)`, and both through the
// function form `pipe(Match.value(x), ...)`. Their handlers are arguments of `Match.when`
// and friends, not object properties, so `handlersOf` sees none.
export const isMatchChain = (node: ESTree.Node | null | undefined) => {
    if (node?.type !== "CallExpression") return false
    const { callee } = node
    if (callee.type === "Identifier")
        return callee.name === "pipe" && isMatchStart(node.arguments[0])
    return (
        callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        callee.property.name === "pipe" &&
        isMatchStart(callee.object)
    )
}

export const handlersOf = (match: ESTree.CallExpression) =>
    match.arguments.flatMap((argument) =>
        argument.type === "ObjectExpression"
            ? argument.properties.flatMap((property) =>
                  property.type === "Property" ? [property.value] : [],
              )
            : [],
    )
