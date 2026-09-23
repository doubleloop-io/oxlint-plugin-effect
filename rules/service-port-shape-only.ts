import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, memberOf } from "../shared/effect-ast.ts"

const legacyServices: ReadonlyArray<readonly [string, string]> = [
    ["Effect", "Service"],
    ["Context", "Tag"],
    ["Context", "GenericTag"],
]

const implementationStatics = new Set(["layer", "Default"])

// `class X extends Context.Service<X, Shape>()(id, options?)`: the outer call carries the id.
const contextServiceIdCall = (superClass: ESTree.Expression | null) =>
    superClass?.type === "CallExpression" && calleeOf(superClass.callee, "Context") === "Service"
        ? superClass
        : undefined

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
                "Keep a `Context.Service` port a pure contract, with implementations in separate Layers.",
        },
        messages: {
            makeOption:
                "Declare the port as shape only: move the implementation into a Layer in its own adapter file.",
            staticImplementation:
                "Do not attach `static {{name}}` to the port: provide the implementation as a Layer in its own adapter file.",
            legacyService:
                "Use `class X extends Context.Service<X, Shape>()(id) {}` instead of `{{name}}`.",
        },
    },
    createOnce(context) {
        const checkClass = (node: ESTree.Class) => {
            const idCall = contextServiceIdCall(node.superClass)
            if (idCall === undefined) return
            const options = idCall.arguments[1]
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
                for (const [object, property] of legacyServices) {
                    if (memberOf(node, object) === property) {
                        context.report({
                            node,
                            messageId: "legacyService",
                            data: { name: `${object}.${property}` },
                        })
                    }
                }
            },
        }
    },
})
