import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    isEffectGenerator,
    isServerComponent,
    memberOf,
    type FunctionNode,
} from "../shared/effect-ast.ts"
import { isTestFile } from "../shared/test-files.ts"

type PromiseStep = {
    readonly node: ESTree.AwaitExpression | ESTree.CallExpression
    involvesEffect: boolean
}

type Frame = {
    readonly fn: FunctionNode
    effectful: boolean
    rendersJsx: boolean
    readonly promiseSteps: Array<PromiseStep>
}

const isThenCall = (node: ESTree.CallExpression) =>
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "then"

const testRunners = new Set(["test", "it"])
const testHooks = new Set(["beforeAll", "afterAll", "beforeEach", "afterEach"])

// `test(…)`, `test.only(…)`, `test.each(table)(…)`: the callee chain roots at the runner or hook.
const testRoleOf = (fn: FunctionNode) => {
    const call = fn.parent
    if (call?.type !== "CallExpression" || !call.arguments.some((arg) => arg === fn))
        return undefined
    let callee: ESTree.Node = call.callee
    while (callee.type === "MemberExpression" || callee.type === "CallExpression") {
        callee = callee.type === "MemberExpression" ? callee.object : callee.callee
    }
    if (callee.type !== "Identifier") return undefined
    if (testRunners.has(callee.name)) return "test"
    if (testHooks.has(callee.name)) return "hook"
    return undefined
}

// Awaiting promise-based fixtures and then one Effect program reads as Arrange/Act/Assert;
// a second Effect step is where promise and Effect sequencing start to interleave.
const interleavesEffectSteps = (frame: Frame) => {
    const effectSteps = frame.promiseSteps.filter((step) => step.involvesEffect)
    return (
        effectSteps.length > 1 || effectSteps.some((step) => step.node.type !== "AwaitExpression")
    )
}

const reportFor = {
    test: "asyncEffectTest",
    hook: "asyncEffectHook",
    helper: "asyncEffectHelper",
} as const

export const singleStylePerFunctionRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description: "Keep each function entirely Effect or entirely async/await.",
        },
        messages: {
            asyncEffect:
                "This function builds Effects: drop `async` and lift promises with `Effect.tryPromise({ try, catch })`.",
            promiseStep:
                "Do not mix promises with Effect in the same function: lift the promise with `Effect.tryPromise({ try, catch })`.",
            asyncEffectTest:
                "This test chains promises around Effect: await a single program and assert on its result, or make its body one Effect with `it.effect` from `@effect/vitest`.",
            asyncEffectHook:
                "This hook chains promises around Effect: await a single program, lifting the promises into it with `Effect.tryPromise({ try, catch })`, or build the fixture as a Layer with `layer` from `@effect/vitest`.",
            asyncEffectHelper:
                "This test helper chains promises around Effect: await a single program, lifting the promises into it with `Effect.tryPromise({ try, catch })`.",
        },
        schema: [],
    },
    createOnce(context) {
        const frames: Array<Frame> = []
        const current = () => frames.at(-1)
        const openSteps: Array<PromiseStep> = []
        let inTestFile = false

        // In a test file a helper such as `probe` or `captureLines` is a promise/Effect boundary
        // like the test that calls it, so it gets the same allowance.
        const roleOf = (fn: FunctionNode) =>
            testRoleOf(fn) ?? (inTestFile && !isEffectGenerator(fn) ? "helper" : undefined)

        const enter = (fn: FunctionNode) => {
            frames.push({
                fn,
                effectful: isEffectGenerator(fn),
                rendersJsx: false,
                promiseSteps: [],
            })
        }

        const openStep = (node: PromiseStep["node"]) => {
            const step = { node, involvesEffect: false }
            current()?.promiseSteps.push(step)
            openSteps.push(step)
        }

        const exit = () => {
            const frame = frames.pop()
            if (frame === undefined) return
            // One report per test or hook: the remedy is its shape, not each promise in it.
            const role = roleOf(frame.fn)
            if (role !== undefined) {
                if (interleavesEffectSteps(frame))
                    context.report({ node: frame.fn, messageId: reportFor[role] })
                return
            }
            if (!frame.effectful || isServerComponent(frame.fn, frame.rendersJsx)) return
            if (frame.fn.async) context.report({ node: frame.fn, messageId: "asyncEffect" })
            for (const step of frame.promiseSteps)
                context.report({ node: step.node, messageId: "promiseStep" })
        }

        const markJsx = () => {
            const frame = current()
            if (frame !== undefined) frame.rendersJsx = true
        }

        return {
            before() {
                inTestFile = isTestFile(context)
            },
            ArrowFunctionExpression: enter,
            FunctionExpression: enter,
            FunctionDeclaration: enter,
            "ArrowFunctionExpression:exit": exit,
            "FunctionExpression:exit": exit,
            "FunctionDeclaration:exit": exit,
            MemberExpression(node) {
                const name = memberOf(node, "Effect")
                if (name === undefined) return
                // A step involves Effect wherever it appears in it, nested callbacks included.
                for (const step of openSteps) step.involvesEffect = true
                const frame = current()
                if (frame === undefined) return
                // `Effect.run*` is how an async boundary legitimately hands off to Effect (P27);
                // where it may appear is run-only-in-runner's business.
                if (!name.startsWith("run")) frame.effectful = true
            },
            JSXElement: markJsx,
            JSXFragment: markJsx,
            AwaitExpression: openStep,
            "AwaitExpression:exit"() {
                openSteps.pop()
            },
            CallExpression(node) {
                if (isThenCall(node)) openStep(node)
            },
            "CallExpression:exit"(node) {
                if (isThenCall(node)) openSteps.pop()
            },
        }
    },
})
