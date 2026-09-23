import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, nearestFunction } from "../shared/effect-ast.ts"

// The *Exit runners hand failures back as values, so an open error channel cannot leak there.
const effectRunners = new Set(["runPromise", "runSync", "runFork", "runCallback"])
const runtimes = ["NodeRuntime", "BunRuntime"]

const isRunnerCall = (node: ESTree.CallExpression) =>
    effectRunners.has(calleeOf(node, "Effect") ?? "") ||
    runtimes.some((runtime) => calleeOf(node, runtime) === "runMain")

const isEffectTypeName = (name: ESTree.TSTypeName) =>
    (name.type === "Identifier" && name.name === "Effect") ||
    (name.type === "TSQualifiedName" &&
        name.left.type === "Identifier" &&
        name.left.name === "Effect" &&
        name.right.name === "Effect")

const isClosedEffectType = (type: ESTree.TSType | undefined) =>
    type?.type === "TSTypeReference" &&
    isEffectTypeName(type.typeName) &&
    type.typeArguments?.params[1]?.type === "TSNeverKeyword"

const parameterType = (identifier: ESTree.IdentifierReference) => {
    for (let fn = nearestFunction(identifier); fn; fn = nearestFunction(fn)) {
        for (const param of fn.params) {
            if (param.type === "Identifier" && param.name === identifier.name) {
                return param.typeAnnotation?.typeAnnotation
            }
        }
    }
    return undefined
}

const hasClosedErrorChannel = (node: ESTree.Argument | undefined) => {
    if (node?.type === "TSSatisfiesExpression") return isClosedEffectType(node.typeAnnotation)
    if (node?.type === "Identifier") return isClosedEffectType(parameterType(node))
    return false
}

export const boundaryEntrypointShapeRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Close the error channel to `never` before running an Effect at the boundary.",
        },
        messages: {
            openErrorChannel:
                "Close the error channel before running: `program satisfies Effect.Effect<A, never>`, or a runner parameter typed `Effect.Effect<A, never, never>`.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                if (isRunnerCall(node) && !hasClosedErrorChannel(node.arguments[0])) {
                    context.report({ node, messageId: "openErrorChannel" })
                }
            },
        }
    },
})
