import type { ESTree } from "@oxlint/plugins"

import { memberOf } from "./effect-ast.ts"

const runtimeEntries: ReadonlyArray<readonly [string, string]> = [
    ["NodeRuntime", "runMain"],
    ["BunRuntime", "runMain"],
    ["ManagedRuntime", "make"],
]

// The qualified name of the runner `node` refers to, when it runs an Effect program.
export const runnerName = (node: ESTree.MemberExpression) => {
    const effectMember = memberOf(node, "Effect")
    if (effectMember?.startsWith("run")) return `Effect.${effectMember}`
    const entry = runtimeEntries.find(([object, property]) => memberOf(node, object) === property)
    return entry === undefined ? undefined : `${entry[0]}.${entry[1]}`
}
