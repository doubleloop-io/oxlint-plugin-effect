import { defineRule, type ESTree, type SourceCode } from "@oxlint/plugins"

import { nearestFunction, type FunctionNode } from "../shared/effect-ast.ts"

// `Effect.Effect`, `Stream.Stream`, `Layer.Layer`: the types that carry error and requirement
// channels collected from everything they call.
const channelModules = new Set(["Effect", "Stream", "Layer"])

const isChannelType = (node: ESTree.TSTypeReference) =>
    node.typeName.type === "TSQualifiedName" &&
    node.typeName.left.type === "Identifier" &&
    channelModules.has(node.typeName.left.name) &&
    node.typeName.right.name === node.typeName.left.name

const isInside = (node: ESTree.Node, ancestor: ESTree.Node) => {
    for (let current = node.parent; current; current = current.parent) {
        if (current === ancestor) return true
    }
    return false
}

const branchesOf = (expression: ESTree.Node): ReadonlyArray<ESTree.Node> =>
    expression.type === "ConditionalExpression"
        ? [...branchesOf(expression.consequent), ...branchesOf(expression.alternate)]
        : [expression]

// Without type information, branches built differently (`Effect.succeed` and `Effect.fail`)
// stand in for an inferred union of effects that the annotation folds into one type.
const returnsDifferentShapes = (branches: ReadonlyArray<ESTree.Node>, sourceCode: SourceCode) => {
    const shapeOf = (branch: ESTree.Node) =>
        branch.type === "CallExpression" || branch.type === "NewExpression"
            ? `${branch.type} ${sourceCode.getText(branch.callee)}`
            : branch.type
    return new Set(branches.map(shapeOf)).size > 1
}

// TypeScript cannot infer the return type of a function that calls itself: it falls back to
// `any` and asks for the annotation.
const isRecursive = (node: FunctionNode, sourceCode: SourceCode) => {
    const declaration = node.type === "FunctionDeclaration" ? node : node.parent
    const name =
        declaration?.type === "FunctionDeclaration"
            ? declaration.id?.name
            : declaration?.type === "VariableDeclarator" && declaration.id.type === "Identifier"
              ? declaration.id.name
              : undefined
    if (declaration === null || name === undefined) return false
    // The declared variables of a function declaration include its parameters.
    return sourceCode
        .getDeclaredVariables(declaration)
        .some(
            (variable) =>
                variable.name === name &&
                variable.references.some((reference) => isInside(reference.identifier, node)),
        )
}

// Only the declaration itself: methods of an exported object and functions it returns are not
// part of the module's signature.
const isExportedDeclaration = (node: FunctionNode) => {
    const declarator = node.parent
    const declaration =
        declarator?.type === "VariableDeclarator" && declarator.init === node
            ? declarator.parent
            : node
    const parent = declaration?.parent?.type
    return parent === "ExportNamedDeclaration" || parent === "ExportDefaultDeclaration"
}

const checksExported = (options: ReadonlyArray<unknown>) => {
    const [first] = options
    return typeof first === "object" && first !== null && "checkExported" in first
        ? first.checkExported === true
        : false
}

export const noEffectReturnTypeRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Let inference type a function returning an Effect: its error and requirement channels change with every callee. Exported declarations are skipped: their annotation is a contract.",
        },
        hasSuggestions: true,
        messages: {
            effectReturnType:
                "Remove the return type annotation: error and requirement channels follow the callees, so inference keeps them up to date.",
            removeReturnType: "Remove the return type annotation.",
        },
        schema: [
            {
                type: "object",
                properties: { checkExported: { type: "boolean" } },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let checkExported = false
        const annotated = new Set<FunctionNode>()
        const returned = new Map<FunctionNode, Array<ESTree.Node>>()

        const collect = (node: ESTree.ReturnStatement) => {
            const fn = nearestFunction(node)
            if (fn === undefined || node.argument === null) return
            returned.set(fn, [...(returned.get(fn) ?? []), node.argument])
        }

        const check = (node: FunctionNode) => {
            const statements = returned.get(node) ?? []
            returned.delete(node)
            if (!annotated.delete(node) || !node.returnType) return
            const expressions =
                node.body?.type === "BlockStatement" ? statements : node.body ? [node.body] : []
            if (returnsDifferentShapes(expressions.flatMap(branchesOf), context.sourceCode)) return
            if (isRecursive(node, context.sourceCode)) return
            if (!checkExported && isExportedDeclaration(node)) return
            const { returnType } = node
            context.report({
                node: returnType,
                messageId: "effectReturnType",
                suggest: [
                    {
                        messageId: "removeReturnType",
                        fix: (fixer) => fixer.remove(returnType),
                    },
                ],
            })
        }

        return {
            before() {
                checkExported = checksExported(context.options)
            },
            TSTypeReference(node) {
                const fn = nearestFunction(node)
                if (fn?.returnType && isChannelType(node) && isInside(node, fn.returnType)) {
                    annotated.add(fn)
                }
            },
            ReturnStatement: collect,
            "ArrowFunctionExpression:exit": check,
            "FunctionDeclaration:exit": check,
            "FunctionExpression:exit": check,
        }
    },
})
