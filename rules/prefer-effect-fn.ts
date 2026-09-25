import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    calleeOf,
    isEffectFnApplication,
    isFunctionNode,
    memberOf,
    type FunctionNode,
} from "../shared/effect-ast.ts"

const isEffectGenChain = (node: ESTree.Node | null | undefined): boolean => {
    if (node?.type !== "CallExpression") return false
    if (calleeOf(node, "Effect") === "gen") return true
    const callee = node.callee
    return (
        callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        callee.property.name === "pipe" &&
        isEffectGenChain(callee.object)
    )
}

const returnedExpression = (fn: FunctionNode) => {
    if (fn.body?.type !== "BlockStatement") return fn.body
    const statements = fn.body.body
    const [only] = statements
    return statements.length === 1 && only?.type === "ReturnStatement" ? only.argument : undefined
}

// Callbacks such as `it.effect("…", () => Effect.gen(…))` are not named functions: only
// declarations, variables and object members get a span name worth having.
const isNamedFunction = (fn: FunctionNode) => {
    const parent = fn.parent
    return (
        fn.type === "FunctionDeclaration" ||
        (parent?.type === "VariableDeclarator" && parent.init === fn) ||
        ((parent?.type === "Property" || parent?.type === "PropertyDefinition") &&
            parent.value === fn)
    )
}

const isPipeCall = (node: ESTree.CallExpression) =>
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "pipe"

// A value keeps its span through `Effect.withSpan`: `Effect.fn` would add only a call-site frame
// that always points at the same line.
const hasSpan = (node: ESTree.Node | null | undefined): boolean =>
    node?.type === "CallExpression" &&
    isPipeCall(node) &&
    node.callee.type === "MemberExpression" &&
    (node.arguments.some((argument) => calleeOf(argument, "Effect") === "withSpan") ||
        hasSpan(node.callee.object))

const isUntracedValue = (node: ESTree.Node | null | undefined) =>
    isEffectGenChain(node) && !hasSpan(node)

export const preferEffectFnRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Write effectful functions with a named `Effect.fn` instead of returning `Effect.gen`.",
        },
        messages: {
            useEffectFn:
                'Use `Effect.fn("name")(function* (...) {...})` instead of a function that returns `Effect.gen`.',
            missingName:
                'Give `Effect.fn` a span name: `Effect.fn("name")(function* (...) {...})`.',
            useEffectFnForValue:
                'Give `{{name}}` a span: declare it as `Effect.fn("{{name}}")(function* () {...})` and call it, or append `.pipe(Effect.withSpan("{{name}}"))`.',
            pipeOnEffectFn:
                "Pass combinators as extra arguments of `Effect.fn(...)(body, ...)` instead of calling `.pipe` on it.",
        },
    },
    createOnce(context) {
        const checkFunction = (fn: FunctionNode) => {
            if (fn.generator || !isNamedFunction(fn)) return
            if (isEffectGenChain(returnedExpression(fn))) {
                context.report({ node: fn, messageId: "useEffectFn" })
            }
        }

        return {
            VariableDeclarator(node) {
                if (node.id.type === "Identifier" && isUntracedValue(node.init)) {
                    context.report({
                        node,
                        messageId: "useEffectFnForValue",
                        data: { name: node.id.name },
                    })
                }
            },
            Property(node) {
                if (node.key.type === "Identifier" && isUntracedValue(node.value)) {
                    context.report({
                        node,
                        messageId: "useEffectFnForValue",
                        data: { name: node.key.name },
                    })
                }
            },
            ArrowFunctionExpression: checkFunction,
            FunctionExpression: checkFunction,
            FunctionDeclaration: checkFunction,
            CallExpression(node) {
                if (memberOf(node.callee, "Effect") === "fn" && isFunctionNode(node.arguments[0])) {
                    context.report({ node, messageId: "missingName" })
                }
                const callee = node.callee
                if (
                    callee.type === "MemberExpression" &&
                    !callee.computed &&
                    callee.property.type === "Identifier" &&
                    callee.property.name === "pipe" &&
                    isEffectFnApplication(callee.object) &&
                    isFunctionNode(callee.object.arguments[0])
                ) {
                    context.report({ node, messageId: "pipeOnEffectFn" })
                }
            },
        }
    },
})
