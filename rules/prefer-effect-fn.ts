import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    calleeOf,
    isEffectFnApplication,
    isFunctionNode,
    memberOf,
    nearestFunction,
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

const isOfCall = (node: ESTree.Node | null | undefined, object: ESTree.Node) =>
    node?.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "of" &&
    node.arguments[0] === object

// Port fields stay Effect values: an object is a port shape when it is passed to `Tag.of(…)`
// or returned to be passed there later, as `openTab` does in GoogleSheet.
const isPortShape = (object: ESTree.Node) => {
    const parent = object.parent
    return (
        isOfCall(parent, object) ||
        parent?.type === "ReturnStatement" ||
        (parent?.type === "ArrowFunctionExpression" && parent.body === object)
    )
}

const isPortField = (property: ESTree.Node) => {
    const object = property.parent
    return object?.type === "ObjectExpression" && isPortShape(object)
}

type NamedValue = {
    readonly node: ESTree.Node
    readonly name: string
    readonly scope: ESTree.Node | undefined
}

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
                'Declare `{{name}}` as `Effect.fn("{{name}}")(function* () {...})` and call it; keep `Effect.gen` inline as an argument.',
            pipeOnEffectFn:
                "Pass combinators as extra arguments of `Effect.fn(...)(body, ...)` instead of calling `.pipe` on it.",
        },
    },
    createOnce(context) {
        let namedValues: Array<NamedValue> = []
        let portFields: Array<{ readonly name: string; readonly scope: ESTree.Node | undefined }> =
            []

        const checkFunction = (fn: FunctionNode) => {
            if (fn.generator || !isNamedFunction(fn)) return
            if (isEffectGenChain(returnedExpression(fn))) {
                context.report({ node: fn, messageId: "useEffectFn" })
            }
        }

        return {
            before() {
                namedValues = []
                portFields = []
            },
            VariableDeclarator(node) {
                if (node.id.type === "Identifier" && isEffectGenChain(node.init)) {
                    namedValues.push({ node, name: node.id.name, scope: nearestFunction(node) })
                }
            },
            Property(node) {
                if (node.key.type !== "Identifier" || !isEffectGenChain(node.value)) return
                if (!isPortField(node)) {
                    context.report({
                        node,
                        messageId: "useEffectFnForValue",
                        data: { name: node.key.name },
                    })
                }
            },
            ObjectExpression(node) {
                if (!isPortShape(node)) return
                for (const property of node.properties) {
                    if (property.type === "Property" && property.value.type === "Identifier") {
                        portFields.push({ name: property.value.name, scope: nearestFunction(node) })
                    }
                }
            },
            "Program:exit"() {
                for (const { node, name, scope } of namedValues) {
                    const isPort = portFields.some(
                        (field) => field.name === name && field.scope === scope,
                    )
                    if (isPort) continue
                    context.report({ node, messageId: "useEffectFnForValue", data: { name } })
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
