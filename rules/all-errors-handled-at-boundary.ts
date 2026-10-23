import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    calleeOf,
    isServerComponent,
    memberOf,
    nearestFunction,
    type FunctionNode,
} from "../shared/effect-ast.ts"
import { filePatternsSchema } from "../shared/file-globs.ts"
import { isTestFile } from "../shared/test-files.ts"

type Frame = {
    readonly fn: FunctionNode
    rendersJsx: boolean
    readonly openRuns: Array<ESTree.CallExpression>
}

// The *Exit runners hand failures back as values, so an open error channel cannot leak there.
// `NodeRuntime.runMain`/`BunRuntime.runMain` are boundaries too: they log the Cause and exit with
// code 1, which is the right outcome for a process failing to start (a ConfigError, a busy port).
const effectRunners = new Set(["runPromise", "runSync", "runFork", "runCallback"])

const isRunnerCall = (node: ESTree.CallExpression) =>
    effectRunners.has(calleeOf(node, "Effect") ?? "")

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

// They turn every failure into a success value, so whatever comes before cannot leak.
// `either` is the Effect 3 name of `result`.
const failureToValue = new Set(["result", "either", "exit"])

const isPipeCall = (node: ESTree.CallExpression) =>
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "pipe"

// `Effect.result(program)` or `program.pipe(…, Effect.result)`.
const endsWithFailureToValue = (node: ESTree.CallExpression) => {
    const last = isPipeCall(node) ? node.arguments.at(-1) : undefined
    const step = last === undefined ? calleeOf(node, "Effect") : memberOf(last, "Effect")
    return failureToValue.has(step ?? "")
}

const hasClosedErrorChannel = (node: ESTree.Argument | undefined) => {
    if (node?.type === "TSSatisfiesExpression") return isClosedEffectType(node.typeAnnotation)
    if (node?.type === "Identifier") return isClosedEffectType(parameterType(node))
    if (node?.type === "CallExpression") return endsWithFailureToValue(node)
    return false
}

export const allErrorsHandledAtBoundaryRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Close the error channel to `never` before running an Effect at the boundary. Test files are skipped.",
        },
        messages: {
            openErrorChannel:
                "Close the error channel before running: `program satisfies Effect.Effect<A, never>`, or a runner parameter typed `Effect.Effect<A, never, never>`.",
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
        const frames: Array<Frame> = []
        let inTestFile = false

        const enter = (fn: FunctionNode) => {
            frames.push({ fn, rendersJsx: false, openRuns: [] })
        }

        // The JSX can follow the run, so whether the function is a Server Component is known only on exit.
        const exit = () => {
            const frame = frames.pop()
            if (frame === undefined || isServerComponent(frame.fn, frame.rendersJsx)) return
            for (const node of frame.openRuns)
                context.report({ node, messageId: "openErrorChannel" })
        }

        const markJsx = () => {
            const frame = frames.at(-1)
            if (frame !== undefined) frame.rendersJsx = true
        }

        return {
            // A test is not a boundary: a rejected run fails it with the error, which is the point.
            before() {
                inTestFile = isTestFile(context)
            },
            ArrowFunctionExpression: enter,
            FunctionExpression: enter,
            FunctionDeclaration: enter,
            "ArrowFunctionExpression:exit": exit,
            "FunctionExpression:exit": exit,
            "FunctionDeclaration:exit": exit,
            JSXElement: markJsx,
            JSXFragment: markJsx,
            CallExpression(node) {
                if (inTestFile) return
                if (!isRunnerCall(node) || hasClosedErrorChannel(node.arguments[0])) return
                const frame = frames.at(-1)
                if (frame === undefined) context.report({ node, messageId: "openErrorChannel" })
                else frame.openRuns.push(node)
            },
        }
    },
})
