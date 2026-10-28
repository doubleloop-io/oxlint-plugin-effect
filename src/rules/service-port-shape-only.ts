import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, memberOf } from "../shared/effect-ast.ts"

// `Live` is the Effect 3 convention for the static layer.
const implementationStatics = new Set(["layer", "Default", "Live"])

// `class X extends Context.Service<X, Shape>()(id, options?)`: the outer call carries the id.
const contextServiceIdCall = (superClass: ESTree.Expression | null) =>
    superClass?.type === "CallExpression" && calleeOf(superClass.callee, "Context") === "Service"
        ? superClass
        : undefined

// Effect 3 `class X extends Context.Tag(id)<X, Shape>() {}`: shape only, like `Context.Service`.
const isContextTagClass = (superClass: ESTree.Expression | null) =>
    superClass?.type === "CallExpression" && calleeOf(superClass.callee, "Context") === "Tag"

const staticMemberName = (member: ESTree.ClassElement) =>
    (member.type === "PropertyDefinition" || member.type === "MethodDefinition") &&
    member.static &&
    member.key.type === "Identifier"
        ? member.key.name
        : undefined

export const servicePortShapeOnlyRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Keep a service port a pure contract (v3: `Context.Tag`, v4: `Context.Service`), with implementations in separate Layers.",
        },
        messages: {
            makeOption:
                "Declare the port as shape only: move the implementation into a Layer in its own adapter file.",
            staticImplementation:
                "Do not attach `static {{name}}` to the port: provide the implementation as a Layer in its own adapter file.",
            effectService:
                "`Effect.Service` ties the port to its implementation: declare the port shape only (v3: `Context.Tag`, v4: `Context.Service`) and provide the implementation as a Layer in its own adapter file.",
        },
    },
    createOnce(context) {
        const checkClass = (node: ESTree.Class) => {
            const idCall = contextServiceIdCall(node.superClass)
            if (idCall === undefined && !isContextTagClass(node.superClass)) return
            const options = idCall?.arguments[1]
            if (options !== undefined) context.report({ node: options, messageId: "makeOption" })
            for (const member of node.body.body) {
                const name = staticMemberName(member)
                if (name !== undefined && implementationStatics.has(name)) {
                    context.report({
                        node: member,
                        messageId: "staticImplementation",
                        data: { name },
                    })
                }
            }
        }

        return {
            ClassDeclaration: checkClass,
            ClassExpression: checkClass,
            MemberExpression(node) {
                if (memberOf(node, "Effect") === "Service") {
                    context.report({ node, messageId: "effectService" })
                }
            },
        }
    },
})
