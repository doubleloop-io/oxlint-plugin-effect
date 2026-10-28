import { defineRule, type ESTree, type Range, type Scope, type SourceCode } from "@oxlint/plugins"

import { nearestFunction } from "../shared/effect-ast.ts"

type Yield = ESTree.YieldExpression

const contains = (outer: Range, inner: Range) => outer[0] <= inner[0] && inner[1] <= outer[1]

const isStandalone = (node: ESTree.Node): boolean => {
    const { parent } = node
    if (!parent) return false
    if (parent.type === "ConditionalExpression" && parent.test !== node) return isStandalone(parent)
    if (parent.type === "LogicalExpression" && parent.right === node) return isStandalone(parent)
    if (parent.type === "VariableDeclarator") return true
    if (parent.type === "AssignmentExpression") return parent.parent.type === "ExpressionStatement"
    return parent.type.endsWith("Statement")
}

const isInStatementList = (node: ESTree.Node) => {
    const { parent } = node
    switch (parent?.type) {
        case "BlockStatement":
        case "Program":
        case "StaticBlock":
            return true
        case "SwitchCase":
            return parent.test !== node
        default:
            return false
    }
}

const statementOf = (node: ESTree.Node) => {
    let current = node
    while (current.parent && !isInStatementList(current)) current = current.parent
    return current
}

const logicalAssignments = new Set(["&&=", "||=", "??="])

// The extracted `const` runs before its statement, once and unconditionally: any position that
// short-circuits, repeats or belongs to a nested statement would change when the effect runs.
const runsOnceBeforeStatement = (
    child: ESTree.Node,
    parent: ESTree.Node,
    statement: ESTree.Node,
) => {
    switch (parent.type) {
        case "LogicalExpression":
            return parent.left === child
        case "ConditionalExpression":
            return parent.test === child
        case "AssignmentExpression":
            return parent.left === child || !logicalAssignments.has(parent.operator)
        case "ChainExpression":
        case "ClassBody":
        case "WhileStatement":
        case "DoWhileStatement":
            return false
        case "ForStatement":
            return parent === statement && parent.init === child
        case "ForInStatement":
        case "ForOfStatement":
            return parent === statement && parent.right === child
        default:
            return parent === statement || !parent.type.endsWith("Statement")
    }
}

const canHoist = (node: Yield, statement: ESTree.Node) => {
    let child: ESTree.Node = node
    while (child !== statement) {
        const parent: ESTree.Node | null = child.parent
        if (!parent || !runsOnceBeforeStatement(child, parent, statement)) return false
        child = parent
    }
    return true
}

// Anything evaluated before a hoisted `yield*` must be hoisted with it, or the order of effects flips.
const reordersEffects = (hoisted: ReadonlyArray<Yield>, effectful: ReadonlyArray<ESTree.Node>) =>
    hoisted.some((target) =>
        effectful.some(
            (node) =>
                node.range[1] <= target.range[0] &&
                !hoisted.some(
                    (moved) =>
                        contains(moved.range, node.range) && moved.range[1] <= target.range[0],
                ),
        ),
    )

const verbPrefix =
    /^(?:get|read|fetch|load|find|parse|decode|make|create|build|compute|resolve|from|to)(?=[A-Z])/

const reservedWords = new Set(
    "arguments await break case catch class const continue debugger default delete do else enum eval export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof undefined var void while with yield".split(
        " ",
    ),
)

const trailingName = (node: ESTree.Node): string | undefined => {
    switch (node.type) {
        case "Identifier":
            return node.name
        case "MemberExpression":
            return !node.computed && node.property.type === "Identifier"
                ? node.property.name
                : undefined
        case "CallExpression":
        case "NewExpression":
            return trailingName(node.callee)
        default:
            return undefined
    }
}

// `yield* readSheet()` becomes `sheet`, `yield* reader.rows` becomes `rows`.
const baseName = (node: Yield) => {
    const name = node.argument ? trailingName(node.argument)?.replace(verbPrefix, "") : undefined
    if (name === undefined || name === "") return "value"
    const variable = name.charAt(0).toLowerCase() + name.slice(1)
    return reservedWords.has(variable) ? "value" : variable
}

const namesInUse = (scope: Scope) => {
    const names = new Set<string>()
    const collect = (inner: Scope) => {
        for (const variable of inner.variables) names.add(variable.name)
        for (const reference of inner.references) names.add(reference.identifier.name)
        inner.childScopes.forEach(collect)
    }
    collect(scope)
    for (let outer = scope.upper; outer; outer = outer.upper) {
        for (const name of outer.set.keys()) names.add(name)
    }
    return names
}

// The parentheses of a call with a single argument belong to the call, not to the `yield*`.
const replacedRange = (node: Yield, sourceCode: SourceCode): Range => {
    const { parent } = node
    const callParens =
        (parent.type === "CallExpression" || parent.type === "NewExpression") &&
        parent.arguments.length === 1
            ? 1
            : 0
    const wrappers: Array<Range> = []
    let before = sourceCode.getTokenBefore(node)
    let after = sourceCode.getTokenAfter(node)
    while (before?.value === "(" && after?.value === ")") {
        wrappers.push([before.range[0], after.range[1]])
        before = sourceCode.getTokenBefore(before)
        after = sourceCode.getTokenAfter(after)
    }
    return wrappers[wrappers.length - 1 - callParens] ?? node.range
}

const extraction = (
    statement: ESTree.Node,
    hoisted: ReadonlyArray<Yield>,
    sourceCode: SourceCode,
) => {
    const taken = namesInUse(sourceCode.getScope(statement).variableScope)
    const replacements = hoisted.map((node) => {
        let name = baseName(node)
        for (let suffix = 2; taken.has(name); suffix++) name = `${baseName(node)}${suffix}`
        taken.add(name)
        return { node, name, range: replacedRange(node, sourceCode) }
    })
    const { text } = sourceCode
    const rewrite = (range: Range, self?: Yield) => {
        const inside = replacements.filter(
            (replacement) => replacement.node !== self && contains(range, replacement.range),
        )
        const outermost = inside
            .filter((replacement) =>
                inside.every(
                    (other) => other === replacement || !contains(other.range, replacement.range),
                ),
            )
            .toSorted((left, right) => left.range[0] - right.range[0])
        let result = ""
        let cursor = range[0]
        for (const replacement of outermost) {
            result += text.slice(cursor, replacement.range[0]) + replacement.name
            cursor = replacement.range[1]
        }
        return result + text.slice(cursor, range[1])
    }
    const lineStart = text.lastIndexOf("\n", statement.range[0] - 1) + 1
    const indentation = text.slice(lineStart, statement.range[0])
    const startsLine = indentation.trim() === ""
    const declarations = replacements.map(
        ({ node, name }) => `const ${name} = ${rewrite(node.range, node)}`,
    )
    const remainder = rewrite(statement.range)
    const guarded = startsLine && /^[[(`+\-/]/.test(remainder) ? `;${remainder}` : remainder
    return [...declarations, guarded].join(startsLine ? `\n${indentation}` : "; ")
}

export const noInlineYieldStarRule = defineRule({
    meta: {
        type: "suggestion",
        fixable: "code",
        docs: {
            description:
                "Bind the result of a `yield*` to a `const` instead of using it inside a larger expression.",
        },
        messages: {
            inlineYieldStar:
                "This `yield*` runs inside a larger expression. Bind its result first (`const rows = yield* reader.rows`), so each statement runs one effect in reading order.",
        },
    },
    createOnce(context) {
        let inline: Array<Yield> = []
        let effectful: Array<ESTree.Node> = []
        const collect = (node: ESTree.Node) => {
            effectful.push(node)
        }
        return {
            before() {
                inline = []
                effectful = []
            },
            YieldExpression(node) {
                effectful.push(node)
                if (node.delegate && !isStandalone(node)) inline.push(node)
            },
            AwaitExpression: collect,
            AssignmentExpression: collect,
            CallExpression: collect,
            NewExpression: collect,
            TaggedTemplateExpression: collect,
            UpdateExpression: collect,
            VariableDeclarator: collect,
            "Program:exit"() {
                const byStatement = new Map<ESTree.Node, Array<Yield>>()
                for (const node of inline) {
                    const statement = statementOf(node)
                    byStatement.set(statement, [...(byStatement.get(statement) ?? []), node])
                }
                for (const [statement, yields] of byStatement) {
                    const owner = nearestFunction(statement)
                    const hoisted = yields
                        .filter((node) => canHoist(node, statement))
                        .toSorted(
                            (left, right) =>
                                left.range[1] - right.range[1] || right.range[0] - left.range[0],
                        )
                    const evaluatedInStatement = effectful.filter(
                        (node) =>
                            contains(statement.range, node.range) &&
                            nearestFunction(node) === owner,
                    )
                    const fixable =
                        statement.type !== "Program" &&
                        hoisted.length > 0 &&
                        !reordersEffects(hoisted, evaluatedInStatement)
                    const replacement = fixable
                        ? extraction(statement, hoisted, context.sourceCode)
                        : undefined
                    for (const node of yields) {
                        context.report({
                            node,
                            messageId: "inlineYieldStar",
                            ...(replacement !== undefined && hoisted.includes(node)
                                ? { fix: (fixer) => fixer.replaceText(statement, replacement) }
                                : {}),
                        })
                    }
                }
            },
        }
    },
})
