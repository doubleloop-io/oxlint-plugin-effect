import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"

// Argument index of the release step, where a promise that cannot reject is the normal case.
const releaseSlots = new Map([
    ["acquireRelease", 1],
    ["acquireUseRelease", 2],
    ["addFinalizer", 0],
])

const isInsideRelease = (node: ESTree.Node) => {
    let child: ESTree.Node = node
    for (let current: ESTree.Node | null = node.parent; current; current = current.parent) {
        const slot = releaseSlots.get(calleeOf(current, "Effect") ?? "")
        if (
            current.type === "CallExpression" &&
            slot !== undefined &&
            current.arguments[slot] === child
        ) {
            return true
        }
        child = current
    }
    return false
}

export const noEffectPromiseRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Prefer `Effect.tryPromise` over `Effect.promise` outside resource release.",
        },
        messages: {
            rejectionAsDefect:
                "`Effect.promise` turns a rejection into a defect: use `Effect.tryPromise({ try, catch })` unless the promise cannot reject.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                if (calleeOf(node, "Effect") === "promise" && !isInsideRelease(node)) {
                    context.report({ node, messageId: "rejectionAsDefect" })
                }
            },
        }
    },
})
