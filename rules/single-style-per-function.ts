import { defineRule, type ESTree } from "@oxlint/plugins"

import { isEffectGenerator, memberOf, type FunctionNode } from "../shared/effect-ast.ts"

type Frame = {
    readonly fn: FunctionNode
    effectful: boolean
    readonly promiseSteps: Array<ESTree.Node>
}

const isThenCall = (node: ESTree.CallExpression) =>
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "then"

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
        },
    },
    createOnce(context) {
        const frames: Array<Frame> = []
        const current = () => frames.at(-1)

        const enter = (fn: FunctionNode) => {
            frames.push({ fn, effectful: isEffectGenerator(fn), promiseSteps: [] })
        }

        const exit = () => {
            const frame = frames.pop()
            if (frame === undefined || !frame.effectful) return
            if (frame.fn.async) context.report({ node: frame.fn, messageId: "asyncEffect" })
            for (const node of frame.promiseSteps)
                context.report({ node, messageId: "promiseStep" })
        }

        return {
            ArrowFunctionExpression: enter,
            FunctionExpression: enter,
            FunctionDeclaration: enter,
            "ArrowFunctionExpression:exit": exit,
            "FunctionExpression:exit": exit,
            "FunctionDeclaration:exit": exit,
            MemberExpression(node) {
                const frame = current()
                const name = memberOf(node, "Effect")
                // `Effect.run*` is how an async boundary legitimately hands off to Effect (P27);
                // where it may appear is run-only-at-entry's business.
                if (frame !== undefined && name !== undefined && !name.startsWith("run")) {
                    frame.effectful = true
                }
            },
            AwaitExpression(node) {
                current()?.promiseSteps.push(node)
            },
            CallExpression(node) {
                if (isThenCall(node)) current()?.promiseSteps.push(node)
            },
        }
    },
})
