import { resolve } from "node:path"

import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf } from "../shared/effect-ast.ts"
import { installedEffectMajor } from "../shared/effect-version.ts"

// `Schema.Class` and `Schema.TaggedError` carry their name already.
const anonymousSchemas = new Set(["Struct", "Union", "Array"])

const chainedMethod = (node: ESTree.Node) =>
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier"
        ? { name: node.callee.property.name, receiver: node.callee.object, call: node }
        : undefined

// `annotations` is the Effect 3 name of `annotate`.
const isAnnotate = (name: string | undefined) => name === "annotate" || name === "annotations"

// `X.pipe(Schema.annotate(a))` and `X.annotate(a)`, in any order along the chain.
const annotationsOf = (init: ESTree.Node) => {
    const annotations: Array<ESTree.Node> = []
    let current: ESTree.Node = init
    while (calleeOf(current, "Schema") === undefined) {
        const link = chainedMethod(current)
        if (link === undefined) return undefined
        if (isAnnotate(link.name)) annotations.push(...link.call.arguments)
        else if (link.name === "pipe") {
            for (const argument of link.call.arguments) {
                if (
                    isAnnotate(calleeOf(argument, "Schema")) &&
                    argument.type === "CallExpression"
                ) {
                    annotations.push(...argument.arguments)
                }
            }
        } else if (link.name !== "check") return undefined
        current = link.receiver
    }
    const root = calleeOf(current, "Schema")
    return root !== undefined && anonymousSchemas.has(root) ? annotations : undefined
}

const identifierOf = (annotations: ReadonlyArray<ESTree.Node>) => {
    for (const annotation of annotations) {
        if (annotation.type !== "ObjectExpression") continue
        for (const property of annotation.properties) {
            if (
                property.type === "Property" &&
                !property.computed &&
                ((property.key.type === "Identifier" && property.key.name === "identifier") ||
                    (property.key.type === "Literal" && property.key.value === "identifier"))
            ) {
                return property.value
            }
        }
    }
    return undefined
}

export const exportedSchemaIdentifierRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Annotate every exported `Schema.Struct`, `Schema.Union` and `Schema.Array` with an `identifier` equal to its name.",
        },
        hasSuggestions: true,
        messages: {
            missingIdentifier:
                'Annotate `{{name}}` with `identifier: "{{name}}"`, so errors, JSON Schema and arbitraries name it.',
            wrongIdentifier:
                'The `identifier` of `{{name}}` is `{{identifier}}`: use `"{{name}}"`, the name the schema is imported by.',
            addIdentifier: 'Append `.{{method}}({ identifier: "{{name}}" })`.',
            renameIdentifier: 'Use `"{{name}}"` as identifier.',
        },
    },
    createOnce(context) {
        // Looked up on the first report of a file only: most files have nothing to fix.
        let annotateMethod: string | undefined
        const annotateMethodOfFile = () => {
            annotateMethod ??=
                installedEffectMajor(resolve(context.cwd, context.filename)) === 3
                    ? "annotations"
                    : "annotate"
            return annotateMethod
        }

        const check = (declarator: ESTree.VariableDeclarator) => {
            const { id, init } = declarator
            if (id.type !== "Identifier" || !init) return
            const annotations = annotationsOf(init)
            if (annotations === undefined) return
            const name = id.name
            const identifier = identifierOf(annotations)
            if (identifier === undefined) {
                const method = annotateMethodOfFile()
                context.report({
                    node: id,
                    messageId: "missingIdentifier",
                    data: { name },
                    suggest: [
                        {
                            messageId: "addIdentifier",
                            data: { name, method },
                            fix: (fixer) =>
                                fixer.insertTextAfter(
                                    init,
                                    `.${method}({ identifier: "${name}" })`,
                                ),
                        },
                    ],
                })
                return
            }
            // A computed identifier cannot be checked without evaluating it.
            if (identifier.type !== "Literal" || typeof identifier.value !== "string") return
            if (identifier.value === name) return
            context.report({
                node: identifier,
                messageId: "wrongIdentifier",
                data: { name, identifier: identifier.value },
                suggest: [
                    {
                        messageId: "renameIdentifier",
                        data: { name },
                        fix: (fixer) => fixer.replaceText(identifier, `"${name}"`),
                    },
                ],
            })
        }

        return {
            before() {
                annotateMethod = undefined
            },
            // Internal fragments, reused through `.fields`, never reach an error message alone.
            ExportNamedDeclaration(node) {
                if (node.declaration?.type !== "VariableDeclaration") return
                node.declaration.declarations.forEach(check)
            },
        }
    },
})
