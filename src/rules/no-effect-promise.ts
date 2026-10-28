import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"
import { isTestFile } from "../shared/test-files.ts"

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
                "Prefer `Effect.tryPromise` over `Effect.promise` outside resource release. Test files are skipped.",
        },
        messages: {
            rejectionAsDefect:
                "`Effect.promise` turns a rejection into a defect: use `Effect.tryPromise({ try, catch })` unless the promise cannot reject.",
        },
        schema: [],
    },
    createOnce(context) {
        let inTestFile = false

        return {
            // A rejection during test setup is a broken test, and a defect fails it with the cause.
            before() {
                inTestFile = isTestFile(context)
            },
            CallExpression(node) {
                if (inTestFile) return
                if (calleeOf(node, "Effect") === "promise" && !isInsideRelease(node)) {
                    context.report({ node, messageId: "rejectionAsDefect" })
                }
            },
        }
    },
})
