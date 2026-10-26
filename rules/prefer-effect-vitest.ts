import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { defineRule } from "@oxlint/plugins"

import { runnerName } from "../shared/effect-runners.ts"
import { isTestFile } from "../shared/test-files.ts"

// Without `@effect/vitest` the remedy is out of reach, so the rule stays silent. Not cached:
// a long-lived linter would miss a later install, and only test files pay for the lookup.
const isEffectVitestInstalled = (filename: string) => {
    for (let dir = dirname(filename); ; dir = dirname(dir)) {
        if (existsSync(join(dir, "node_modules", "@effect", "vitest", "package.json"))) return true
        if (dirname(dir) === dir) return false
    }
}

// Reports references too, not only calls: `const run = Effect.runPromise` escapes nothing.
export const preferEffectVitestRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Run Effects in tests through `@effect/vitest`. Only test files of projects that install it are checked.",
        },
        messages: {
            runInTest:
                "`{{name}}` runs an Effect program in a test: let `@effect/vitest` run it, so the test gets the test runtime and its fixtures become Layers.",
        },
        schema: [],
    },
    createOnce(context) {
        let checked = false

        return {
            before() {
                checked =
                    isTestFile(context) &&
                    isEffectVitestInstalled(resolve(context.cwd, context.filename))
            },
            MemberExpression(node) {
                if (!checked) return
                const name = runnerName(node)
                if (name !== undefined)
                    context.report({ node, messageId: "runInTest", data: { name } })
            },
        }
    },
})
