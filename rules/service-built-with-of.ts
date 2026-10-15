import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, isFunctionNode, type FunctionNode } from "../shared/effect-ast.ts"

const layerConstructors = new Set(["succeed", "sync", "effect", "scoped"])

// `Layer.succeed(T, impl)` and the curried `Layer.succeed(T)(impl)`.
const layerApplication = (node: ESTree.CallExpression) => {
    const dataFirst = calleeOf(node, "Layer")
    if (dataFirst !== undefined && node.arguments.length === 2) {
        return { constructor: dataFirst, tag: node.arguments[0], impl: node.arguments[1] }
    }
    const curried =
        node.callee.type === "CallExpression" ? calleeOf(node.callee, "Layer") : undefined
    if (curried !== undefined && node.callee.type === "CallExpression") {
        return { constructor: curried, tag: node.callee.arguments[0], impl: node.arguments[0] }
    }
    return undefined
}

const returnedObjects = (fn: FunctionNode) => {
    if (fn.body?.type === "ObjectExpression") return [fn.body]
    if (fn.body?.type !== "BlockStatement") return []
    return fn.body.body.flatMap((statement) =>
        statement.type === "ReturnStatement" && statement.argument?.type === "ObjectExpression"
            ? [statement.argument]
            : [],
    )
}

const implementationObjects = (constructor: string, impl: ESTree.Node | undefined) => {
    if (constructor === "succeed") return impl?.type === "ObjectExpression" ? [impl] : []
    if (constructor === "sync") return isFunctionNode(impl) ? returnedObjects(impl) : []
    if (impl?.type !== "CallExpression" || calleeOf(impl, "Effect") !== "gen") return []
    return impl.arguments.flatMap((argument) =>
        isFunctionNode(argument) && argument.generator ? returnedObjects(argument) : [],
    )
}

export const serviceBuiltWithOfRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Build the service a Layer provides with `Tag.of({…})` instead of a bare object literal.",
        },
        hasSuggestions: true,
        messages: {
            bareLiteral:
                "Build the service with `{{tag}}.of({…})`: it names the service the object implements and keeps its type checked if the literal moves out of the Layer.",
            wrapWithOf: "Wrap the literal in `{{tag}}.of(…)`.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                const application = layerApplication(node)
                if (application === undefined || !layerConstructors.has(application.constructor)) {
                    return
                }
                const { tag, impl } = application
                if (tag === undefined || tag.type === "SpreadElement") return
                const tagText = context.sourceCode.getText(tag)
                for (const literal of implementationObjects(application.constructor, impl)) {
                    context.report({
                        node: literal,
                        messageId: "bareLiteral",
                        data: { tag: tagText },
                        suggest: [
                            {
                                messageId: "wrapWithOf",
                                data: { tag: tagText },
                                fix: (fixer) =>
                                    fixer.replaceText(
                                        literal,
                                        `${tagText}.of(${context.sourceCode.getText(literal)})`,
                                    ),
                            },
                        ],
                    })
                }
            },
        }
    },
})
