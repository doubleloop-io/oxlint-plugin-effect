import { defineRule, type ESTree } from "@oxlint/plugins"

import { memberOf } from "../shared/effect-ast.ts"
import { isEntryFile } from "../shared/entry-files.ts"
import { filePatternsSchema } from "../shared/file-globs.ts"

const runtimeEntries: ReadonlyArray<readonly [string, string]> = [
    ["NodeRuntime", "runMain"],
    ["BunRuntime", "runMain"],
    ["ManagedRuntime", "make"],
]

const runnerName = (node: ESTree.MemberExpression) => {
    const effectMember = memberOf(node, "Effect")
    if (effectMember?.startsWith("run")) return `Effect.${effectMember}`
    const entry = runtimeEntries.find(([object, property]) => memberOf(node, object) === property)
    return entry === undefined ? undefined : `${entry[0]}.${entry[1]}`
}

// Reports references too, not only calls: `const run = Effect.runPromise` escapes nothing.
export const runOnlyAtEntryRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description: "Run Effect programs only at the entry point. Entry files are skipped.",
        },
        messages: {
            runOutsideEntry:
                "`{{name}}` runs an Effect program: only the entry point may do that. Tests use `it.effect`.",
        },
        schema: [
            {
                type: "object",
                properties: { entryFiles: filePatternsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let inEntryFile = false

        return {
            before() {
                inEntryFile = isEntryFile(context)
            },
            MemberExpression(node) {
                if (inEntryFile) return
                const name = runnerName(node)
                if (name !== undefined)
                    context.report({ node, messageId: "runOutsideEntry", data: { name } })
            },
        }
    },
})
