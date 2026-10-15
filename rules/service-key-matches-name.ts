import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"

// `class X extends Context.Service<X, Shape>()(key)`: the outer call carries the key.
const contextServiceKey = (superClass: ESTree.Expression | null) =>
    superClass?.type === "CallExpression" && calleeOf(superClass.callee, "Context") === "Service"
        ? superClass.arguments[0]
        : undefined

const literalKey = (node: ESTree.Node | undefined) => {
    if (node?.type === "Literal" && typeof node.value === "string") return node.value
    if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? undefined
    }
    return undefined
}

const className = (node: ESTree.Class) => {
    if (node.id !== null) return node.id.name
    const declarator = node.parent
    return declarator?.type === "VariableDeclarator" && declarator.id.type === "Identifier"
        ? declarator.id.name
        : undefined
}

// A path prefix (`"app/db/Database"`) is the key `AGENTS.md` recommends: only the last segment
// has to be the name.
const keyFor = (key: string, name: string) => {
    const slash = key.lastIndexOf("/")
    return slash === -1 ? name : `${key.slice(0, slash + 1)}${name}`
}

export const serviceKeyMatchesNameRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Key a `Context.Service` class with its own name, alone or after a path prefix.",
        },
        hasSuggestions: true,
        messages: {
            keyMismatch:
                'The key `"{{key}}"` does not end with the class name `{{name}}`: the key is the service\'s identity in errors and traces.',
            useKey: 'Use `"{{expected}}"`.',
        },
    },
    createOnce(context) {
        const checkClass = (node: ESTree.Class) => {
            const keyNode = contextServiceKey(node.superClass)
            const key = literalKey(keyNode)
            const name = className(node)
            if (keyNode === undefined || key === undefined || name === undefined) return
            if (key === name || key.endsWith(`/${name}`)) return
            const expected = keyFor(key, name)
            context.report({
                node: keyNode,
                messageId: "keyMismatch",
                data: { key, name },
                suggest: [
                    {
                        messageId: "useKey",
                        data: { expected },
                        fix: (fixer) => fixer.replaceText(keyNode, JSON.stringify(expected)),
                    },
                ],
            })
        }

        return {
            ClassDeclaration: checkClass,
            ClassExpression: checkClass,
        }
    },
})
