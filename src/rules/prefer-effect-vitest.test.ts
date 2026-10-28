import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { RuleTester } from "oxlint/plugins-dev"

import { preferEffectVitestRule } from "./prefer-effect-vitest.ts"

const projectWith = (packages: ReadonlyArray<string>) => {
    const root = mkdtempSync(join(tmpdir(), "prefer-effect-vitest-"))
    for (const name of packages) {
        mkdirSync(join(root, "node_modules", name), { recursive: true })
        writeFileSync(join(root, "node_modules", name, "package.json"), JSON.stringify({ name }))
    }
    return root
}

const adopting = projectWith(["@effect/vitest"])
const notAdopting = projectWith(["vitest"])
const filename = "src/event-creation.test.ts"

new RuleTester().run("prefer-effect-vitest", preferEffectVitestRule, {
    valid: [
        {
            cwd: adopting,
            filename,
            code: "it.effect('creates an event', () => createEvent(request))",
        },
        { cwd: adopting, filename: "src/main.ts", code: "NodeRuntime.runMain(program)" },
        {
            cwd: adopting,
            filename,
            code: "const done = Effect.runPromise(program)",
            settings: { "dl-effect": { testFiles: ["**/*.check.ts"] } },
        },
        { cwd: notAdopting, filename, code: "const done = Effect.runPromise(program)" },
    ],
    invalid: [
        {
            cwd: adopting,
            filename,
            code: "test('creates an event', async () => { await Effect.runPromise(createEvent(request)) })",
            errors: [{ messageId: "runInTest", data: { name: "Effect.runPromise" } }],
        },
        {
            cwd: adopting,
            filename,
            code: "const runtime = ManagedRuntime.make(testLayer)",
            errors: [{ messageId: "runInTest", data: { name: "ManagedRuntime.make" } }],
        },
        {
            cwd: adopting,
            filename,
            code: "const run = Effect.runSync",
            errors: [{ messageId: "runInTest", data: { name: "Effect.runSync" } }],
        },
        {
            cwd: adopting,
            filename: "src/event-creation.check.ts",
            code: "const done = Effect.runPromise(program)",
            settings: { "dl-effect": { testFiles: ["**/*.check.ts"] } },
            errors: [{ messageId: "runInTest", data: { name: "Effect.runPromise" } }],
        },
        // A workspace package finds `@effect/vitest` hoisted to the repository root.
        {
            cwd: adopting,
            filename: "apps/api/src/event-creation.test.ts",
            code: "const done = Effect.runPromise(program)",
            errors: [{ messageId: "runInTest", data: { name: "Effect.runPromise" } }],
        },
    ],
})
