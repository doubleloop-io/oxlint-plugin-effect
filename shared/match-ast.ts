import type { ESTree } from "@oxlint/plugins"

import { calleeOf, isFunctionNode, memberOf, type FunctionNode } from "./effect-ast.ts"

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

const returnedExpressions = (fn: FunctionNode): ReadonlyArray<ESTree.Node> => {
    if (fn.body?.type !== "BlockStatement") return fn.body ? [fn.body] : []
    return fn.body.body.flatMap((statement) =>
        statement.type === "ReturnStatement" && statement.argument ? [statement.argument] : [],
    )
}

// What `no-nested-match` reports in a handler: itself a match, or a returned match or ternary.
export const nestedBranches = (handler: ESTree.Node): ReadonlyArray<ESTree.Node> => {
    if (isMatchCall(handler) || isMatchChain(handler)) return [handler]
    if (!isFunctionNode(handler)) return []
    return returnedExpressions(handler).filter(
        (expression) =>
            isMatchCall(expression) ||
            isMatchChain(expression) ||
            expression.type === "ConditionalExpression",
    )
}
