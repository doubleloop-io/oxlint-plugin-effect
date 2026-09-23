import type { ESTree } from "@oxlint/plugins"

import { memberOf } from "./effect-ast.ts"

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

export const handlersOf = (match: ESTree.CallExpression) =>
    match.arguments.flatMap((argument) =>
        argument.type === "ObjectExpression"
            ? argument.properties.flatMap((property) =>
                  property.type === "Property" ? [property.value] : [],
              )
            : [],
    )
