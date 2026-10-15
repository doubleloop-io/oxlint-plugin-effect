import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    calleeOf,
    isEffectGenerator,
    isFunctionNode,
    memberOf,
    nearestFunction,
} from "../shared/effect-ast.ts"
import { handlersOf, nestedBranches } from "../shared/match-ast.ts"

const guards = { Option: "Option.isNone", Result: "Result.isFailure" } as const

type MatchedModule = keyof typeof guards

const matchedModule = (node: ESTree.Node | undefined): MatchedModule | undefined => {
    if (node?.type !== "CallExpression") return undefined
    if (memberOf(node.callee, "Option") === "match") return "Option"
    if (memberOf(node.callee, "Result") === "match") return "Result"
    return undefined
}

const isPipe = (callee: ESTree.Node) =>
    (callee.type === "Identifier" && callee.name === "pipe") ||
    (callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        callee.property.name === "pipe")

// Data-first `Option.match(x, {…})`, or a match as the last step of `x.pipe(…)`/`pipe(x, …)`.
const yieldedMatch = (node: ESTree.Node | null) => {
    if (node?.type !== "CallExpression") return undefined
    if (matchedModule(node) !== undefined && node.arguments.length === 2) return node
    if (!isPipe(node.callee)) return undefined
    const last = node.arguments.at(-1)
    return matchedModule(last) !== undefined && last?.type === "CallExpression" ? last : undefined
}

const handlerNamed = (match: ESTree.CallExpression, name: string) => {
    for (const argument of match.arguments) {
        if (argument.type !== "ObjectExpression") continue
        for (const property of argument.properties) {
            if (
                property.type === "Property" &&
                !property.computed &&
                property.key.type === "Identifier" &&
                property.key.name === name
            ) {
                return property.value
            }
        }
    }
    return undefined
}

// `onSome: Effect.succeed` or `onSome: (x) => Effect.succeed(x)`.
const resultsIn = (handler: ESTree.Node | undefined, constructor: string) => {
    if (memberOf(handler, "Effect") === constructor) return true
    return (
        isFunctionNode(handler) &&
        handler.body?.type !== "BlockStatement" &&
        calleeOf(handler.body, "Effect") === constructor
    )
}

// `option-match-to-from-option` (effecttsgo) proposes `Effect.fromOption` for this shape.
const isFromOptionShape = (match: ESTree.CallExpression) =>
    matchedModule(match) === "Option" &&
    resultsIn(handlerNamed(match, "onNone"), "fail") &&
    resultsIn(handlerNamed(match, "onSome"), "succeed")

export const noYieldedMatchRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Inside an Effect generator, return early on the empty or failed case instead of yielding an `Option.match`/`Result.match`.",
        },
        messages: {
            yieldedMatch:
                "This `yield*` of a `{{module}}.match` splits the generator into two branches: return early with `if ({{guard}}(…)) return …` and keep one main path.",
        },
    },
    createOnce(context) {
        return {
            YieldExpression(node) {
                if (!node.delegate) return
                const match = yieldedMatch(node.argument)
                const module = matchedModule(match)
                if (match === undefined || module === undefined) return
                const generator = nearestFunction(node)
                if (generator === undefined || !isEffectGenerator(generator)) return
                if (isFromOptionShape(match)) return
                if (handlersOf(match).some((handler) => nestedBranches(handler).length > 0)) return
                context.report({
                    node: match,
                    messageId: "yieldedMatch",
                    data: { module, guard: guards[module] },
                })
            },
        }
    },
})
