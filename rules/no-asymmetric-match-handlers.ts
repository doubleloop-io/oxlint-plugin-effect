import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, isEffectFnApplication, isFunctionNode } from "../shared/effect-ast.ts"
import { handlersOf, isMatchCall } from "../shared/match-ast.ts"

type HandlerShape = "delegating" | "inline" | "value"

const isDelegation = (node: ESTree.Node | null | undefined) =>
    node?.type === "Identifier" ||
    node?.type === "MemberExpression" ||
    node?.type === "CallExpression" ||
    node?.type === "NewExpression"

const isEffectBody = (node: ESTree.Node) =>
    node.type === "CallExpression" &&
    (isEffectFnApplication(node) || calleeOf(node, "Effect") === "gen") &&
    node.arguments.some(isFunctionNode)

const shapeOfResult = (node: ESTree.Node | null | undefined): HandlerShape => {
    if (!node) return "value"
    if (isEffectBody(node)) return "inline"
    return isDelegation(node) ? "delegating" : "value"
}

// Literals, templates, arrays and ternaries produce a value rather than implement a step,
// so they sit on either side of an asymmetry without breaking it.
const shapeOf = (handler: ESTree.Node): HandlerShape => {
    if (!isFunctionNode(handler)) return shapeOfResult(handler)
    if (!handler.body) return "value"
    if (handler.generator) return "inline"
    if (handler.body.type !== "BlockStatement") return shapeOfResult(handler.body)
    const [only, ...rest] = handler.body.body
    if (!only) return "value"
    if (rest.length > 0 || only.type !== "ReturnStatement") return "inline"
    return shapeOfResult(only.argument)
}

const effectFnName = (handler: ESTree.Node) => {
    if (handler.type !== "CallExpression" || handler.callee.type !== "CallExpression") return
    const [name] = handler.callee.arguments
    return name?.type === "Literal" && typeof name.value === "string" ? name.value : undefined
}

export const noAsymmetricMatchHandlersRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Keep the handlers of a match at one level of abstraction: when one delegates to a named function, extract the inline ones too.",
        },
        messages: {
            inlineHandler:
                "This handler is implemented inline while another branch of the same match delegates to a named function. Extract it into a named function{{hint}} and call it from the handler.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                if (!isMatchCall(node)) return
                const handlers = handlersOf(node)
                const shapes = handlers.map(shapeOf)
                if (!shapes.includes("delegating")) return
                handlers.forEach((handler, index) => {
                    if (shapes[index] !== "inline") return
                    const name = effectFnName(handler)
                    context.report({
                        node: handler,
                        messageId: "inlineHandler",
                        data: { hint: name ? ` (\`${name}\`)` : "" },
                    })
                })
            },
        }
    },
})
