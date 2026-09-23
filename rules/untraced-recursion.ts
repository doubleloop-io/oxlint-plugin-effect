import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, isFunctionNode } from "../shared/effect-ast.ts"

// `Effect.fn("name")(body)` and `Effect.fn(body)`; `Effect.fnUntraced` is what the rule asks for.
const tracedBody = (node: ESTree.Node | null | undefined) => {
    if (node?.type !== "CallExpression") return undefined
    const isTraced = calleeOf(node, "Effect") === "fn" || calleeOf(node.callee, "Effect") === "fn"
    const [body] = node.arguments
    return isTraced && isFunctionNode(body) ? body : undefined
}

const isInside = (node: ESTree.Node, ancestor: ESTree.Node) => {
    for (let current = node.parent; current; current = current.parent) {
        if (current === ancestor) return true
    }
    return false
}

// Every recursive call of a traced function opens a span nested in the previous one and
// captures a stack frame: the trace grows with the depth instead of naming one unit of work.
export const untracedRecursionRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Write recursive effectful functions with `Effect.fnUntraced`, so each level does not open a nested span.",
        },
        messages: {
            recursiveTraced:
                "`{{name}}` calls itself: use `Effect.fnUntraced` and trace the entry point that starts the recursion.",
        },
    },
    createOnce(context) {
        return {
            VariableDeclarator(node) {
                const body = tracedBody(node.init)
                if (node.id.type !== "Identifier" || body === undefined) return
                const [variable] = context.sourceCode.getDeclaredVariables(node)
                const recursive = variable?.references.some((reference) =>
                    isInside(reference.identifier, body),
                )
                if (recursive === true) {
                    context.report({
                        node: node.id,
                        messageId: "recursiveTraced",
                        data: { name: node.id.name },
                    })
                }
            },
        }
    },
})
