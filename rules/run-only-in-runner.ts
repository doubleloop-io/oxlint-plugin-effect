import { defineRule } from "@oxlint/plugins"

import { runnerName } from "../shared/effect-runners.ts"
import { isEntryFile } from "../shared/entry-files.ts"
import { filePatternsSchema } from "../shared/file-globs.ts"
import { isTestFile } from "../shared/test-files.ts"

// Reports references too, not only calls: `const run = Effect.runPromise` escapes nothing.
export const runOnlyInRunnerRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description:
                "Run Effect programs only at the entry point. Entry and test files are skipped.",
        },
        messages: {
            runOutsideEntry: "`{{name}}` runs an Effect program: only the entry point may do that.",
        },
        schema: [
            {
                type: "object",
                properties: { entryFiles: filePatternsSchema, testFiles: filePatternsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let skipped = false

        return {
            // How tests run their Effects is `prefer-effect-vitest`'s concern.
            before() {
                skipped = isEntryFile(context) || isTestFile(context)
            },
            MemberExpression(node) {
                if (skipped) return
                const name = runnerName(node)
                if (name !== undefined)
                    context.report({ node, messageId: "runOutsideEntry", data: { name } })
            },
        }
    },
})
