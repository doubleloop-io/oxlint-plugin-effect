import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    type FunctionNode,
    isEffectGenerator,
    isInsideEffectGeneratorBody,
    memberOf,
    nearestFunction,
} from "../shared/effect-ast.ts"
import { filePatternsSchema } from "../shared/file-globs.ts"
import { isTestFile } from "../shared/test-files.ts"

// mapError, orElse and orElseSucceed stay allowed: they name a failure or give an alternative
// without opening a handling branch inside the success path.
const errorHandlers = new Set([
    "catch",
    "catchAll",
    "catchCause",
    "catchCauseFilter",
    "catchCauseIf",
    "catchDefect",
    "catchEager",
    "catchFilter",
    "catchIf",
    "catchReason",
    "catchReasons",
    "catchTag",
    "catchTags",
    "either",
    "exit",
    "match",
    "matchCause",
    "matchCauseEffect",
    "matchEffect",
    "result",
    "sandbox",
])

// Effect 4 names first, then the v3 ones without a v4 counterpart.
const iterationCombinators = new Set([
    "filter",
    "filterMap",
    "filterMapEffect",
    "findFirst",
    "findFirstFilter",
    "forEach",
    "partition",
    "reduce",
    "validate",
    "dropUntil",
    "dropWhile",
    "every",
    "exists",
    "mergeAll",
    "reduceWhile",
    "takeUntil",
    "takeWhile",
    "validateAll",
    "validateFirst",
])

const failureCatchers = new Set([
    "catch",
    "catchAll",
    "catchFilter",
    "catchIf",
    "catchTag",
    "catchTags",
])

const isEffectDie = (node: ESTree.Node | null | undefined) =>
    ["die", "dieMessage"].includes(memberOf(node, "Effect") ?? "")

const returnedExpression = (fn: FunctionNode) => {
    if (fn.body?.type !== "BlockStatement") return fn.body
    const [statement, ...rest] = fn.body.body
    return rest.length === 0 && statement?.type === "ReturnStatement" ? statement.argument : null
}

const onlyDies = (handler: ESTree.Node) => {
    if (isEffectDie(handler)) return true
    if (handler.type !== "ArrowFunctionExpression" && handler.type !== "FunctionExpression") {
        return false
    }
    const returned = returnedExpression(handler)
    return returned?.type === "CallExpression" && isEffectDie(returned.callee)
}

// Turning a failure into a defect is a selective `orDie`, which stays allowed: it declares the case
// untracked rather than handling it. The handler is the last argument in both the pipeable and the
// data-first forms; `catchTags` takes an object of handlers and is exempt only when all of them die.
const isDieOnlyCatch = (node: ESTree.MemberExpression, name: string) => {
    const call = node.parent
    if (call?.type !== "CallExpression" || call.callee !== node || !failureCatchers.has(name)) {
        return false
    }
    const handler = call.arguments.at(-1)
    if (handler === undefined) return false
    if (name !== "catchTags") return onlyDies(handler)
    return (
        handler.type === "ObjectExpression" &&
        handler.properties.length > 0 &&
        handler.properties.every(
            (property) => property.type === "Property" && onlyDies(property.value),
        )
    )
}

// A handler in the callback of an iteration (`Effect.forEach(items, (item) => ... Effect.catch ...)`)
// handles each element on its own; moved to the `Effect.fn` pipeables, the first failure would stop
// them all. Other callbacks (`flatMap`, `tap`) stay on the success path and are still reported.
const isInsideIterationCallback = (node: ESTree.Node) => {
    for (let fn = nearestFunction(node); fn && !isEffectGenerator(fn); fn = nearestFunction(fn)) {
        const call = fn.parent
        if (
            call?.type === "CallExpression" &&
            iterationCombinators.has(memberOf(call.callee, "Effect") ?? "")
        ) {
            return true
        }
    }
    return false
}

export const errorHandlingInEffectFnHandlerRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Keep only the success path in Effect generators and handle errors in the second argument of `Effect.fn`. Test files are skipped.",
        },
        messages: {
            handlerInGenerator:
                "Move `Effect.{{name}}` out of the generator: keep the success path in the body and handle errors in the pipeable arguments of `Effect.fn`.",
        },
        schema: [
            {
                type: "object",
                properties: { testFiles: filePatternsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let inTestFile = false

        return {
            // In a test the failure is the observed outcome, not a branch of the success path.
            before() {
                inTestFile = isTestFile(context)
            },
            MemberExpression(node) {
                const name = memberOf(node, "Effect")
                if (
                    inTestFile ||
                    name === undefined ||
                    !errorHandlers.has(name) ||
                    !isInsideEffectGeneratorBody(node) ||
                    isInsideIterationCallback(node) ||
                    isDieOnlyCatch(node, name)
                ) {
                    return
                }
                context.report({ node, messageId: "handlerInGenerator", data: { name } })
            },
        }
    },
})
