import type { ESTree } from "@oxlint/plugins"

export type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression

export const isFunctionNode = (node: ESTree.Node | null | undefined): node is FunctionNode =>
    node?.type === "ArrowFunctionExpression" ||
    node?.type === "FunctionExpression" ||
    node?.type === "FunctionDeclaration"

// Like the anti-slop rules, names are matched literally: `import { Effect as E }` escapes.
export const memberOf = (
    node: ESTree.Node | null | undefined,
    object: string,
): string | undefined => {
    if (
        node?.type !== "MemberExpression" ||
        node.computed ||
        node.object.type !== "Identifier" ||
        node.object.name !== object ||
        node.property.type !== "Identifier"
    ) {
        return undefined
    }
    return node.property.name
}

export const calleeOf = (node: ESTree.Node | null | undefined, object: string) =>
    node?.type === "CallExpression" ? memberOf(node.callee, object) : undefined

// Both `Effect.fn("name")(body, ...pipeables)` and the unnamed `Effect.fn(body, ...pipeables)`.
export const isEffectFnApplication = (
    node: ESTree.Node | null | undefined,
): node is ESTree.CallExpression => {
    if (node?.type !== "CallExpression") return false
    const factory = memberOf(node.callee, "Effect")
    return factory === "fn" || factory === "fnUntraced" || calleeOf(node.callee, "Effect") === "fn"
}

export const isEffectGenerator = (fn: FunctionNode) => {
    const call = fn.parent
    if (!fn.generator || call?.type !== "CallExpression") return false
    if (calleeOf(call, "Effect") === "gen") return call.arguments.some((arg) => arg === fn)
    return isEffectFnApplication(call) && call.arguments[0] === fn
}

const isEffectCombinatorCallback = (fn: FunctionNode) =>
    fn.parent?.type === "CallExpression" &&
    memberOf(fn.parent.callee, "Effect") !== undefined &&
    fn.parent.arguments.some((arg) => arg === fn)

// Callbacks handed to an `Effect.*` combinator inside the generator still belong to its success
// path; the pipeable arguments of an `Effect.fn` nested in it are the handler slot, so they do
// not, and neither does a function the generator only defines (an HTTP handler, a service method).
export const isInsideEffectGeneratorBody = (node: ESTree.Node) => {
    let child: ESTree.Node = node
    for (let current: ESTree.Node | null = node.parent; current; current = current.parent) {
        if (
            isEffectFnApplication(current) &&
            current.arguments.findIndex((arg) => arg === child) > 0
        ) {
            return false
        }
        if (isFunctionNode(current)) {
            if (current.generator) return isEffectGenerator(current)
            if (!isEffectCombinatorCallback(current)) return false
        }
        child = current
    }
    return false
}

export const nearestFunction = (node: ESTree.Node): FunctionNode | undefined => {
    for (let current: ESTree.Node | null = node.parent; current; current = current.parent) {
        if (isFunctionNode(current)) return current
    }
    return undefined
}

// An async function that renders JSX is a React Server Component: it hands its outcome to React,
// and how failures become UI is the application's call, not a rule's.
export const isServerComponent = (fn: FunctionNode, rendersJsx: boolean) => fn.async && rendersJsx
