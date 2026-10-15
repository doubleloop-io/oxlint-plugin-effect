import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, isEffectFnApplication } from "../shared/effect-ast.ts"
import { filePatternsSchema } from "../shared/file-globs.ts"
import { isTestFile } from "../shared/test-files.ts"

const pipeReceiver = (call: ESTree.CallExpression) => {
    const { callee } = call
    return callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.property.type === "Identifier" &&
        callee.property.name === "pipe"
        ? callee.object
        : undefined
}

const isProgramDefinition = (node: ESTree.Node | undefined): boolean => {
    if (node?.type !== "CallExpression") return false
    if (calleeOf(node, "Effect") === "gen" || isEffectFnApplication(node)) return true
    return isProgramDefinition(pipeReceiver(node))
}

const isContextCapture = (init: ESTree.Node | null | undefined) => {
    if (init?.type !== "YieldExpression" || !init.delegate) return false
    let source: ESTree.Node | null | undefined = init.argument
    while (source?.type === "CallExpression" && pipeReceiver(source)) source = pipeReceiver(source)
    return calleeOf(source, "Effect") === "context"
}

const isCapturedContext = (value: ESTree.Node | undefined) => {
    if (value?.type !== "Identifier") return false
    for (let current: ESTree.Node | null = value.parent; current; current = current.parent) {
        if (current.type !== "BlockStatement") continue
        const captured = current.body.some(
            (statement) =>
                statement.type === "VariableDeclaration" &&
                statement.kind === "const" &&
                statement.declarations.some(
                    (declarator) =>
                        declarator.id.type === "Identifier" &&
                        declarator.id.name === value.name &&
                        isContextCapture(declarator.init),
                ),
        )
        if (captured) return true
    }
    return false
}

const providedValue = (provide: ESTree.CallExpression) =>
    provide.arguments[provide.arguments.length > 1 ? 1 : 0]

const providedDefinition = (provide: ESTree.CallExpression) => {
    if (provide.arguments.length > 1) return isProgramDefinition(provide.arguments[0])
    const parent = provide.parent
    if (parent?.type !== "CallExpression") return false
    // `Effect.fn("name")(body, Effect.provide(layer))`: the pipeable slot belongs to the definition.
    if (isEffectFnApplication(parent) && parent.arguments.indexOf(provide) > 0) return true
    return parent.arguments.includes(provide) && isProgramDefinition(pipeReceiver(parent))
}

// A program that provides its own layers can no longer be wired differently by its caller:
// the dispatch that picks the adapters is where `Effect.provide` belongs.
export const noProvideOnDefinitionRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Keep `Effect.provide` off `Effect.gen`/`Effect.fn` definitions; provide where the program is dispatched. Test files are skipped.",
        },
        messages: {
            provideOnDefinition:
                "Define the program without layers and apply `Effect.provide` where it is dispatched, to a named program.",
        },
        schema: [
            {
                type: "object",
                properties: { testFiles: filePatternsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let inTestFile = false

        return {
            // `it.effect(…, () => Effect.gen(…).pipe(Effect.provide(fakes)))` is the idiomatic test.
            before() {
                inTestFile = isTestFile(context)
            },
            CallExpression(node) {
                if (inTestFile || calleeOf(node, "Effect") !== "provide") return
                // A Layer that captures its context with `Effect.context()` hands it back to each
                // method: the caller already chose the adapters when it built the Layer.
                if (providedDefinition(node) && !isCapturedContext(providedValue(node))) {
                    context.report({ node, messageId: "provideOnDefinition" })
                }
            },
        }
    },
})
