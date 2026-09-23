import { RuleTester } from "oxlint/plugins-dev"

import { runOnlyAtEntryRule } from "./run-only-at-entry.ts"

new RuleTester().run("run-only-at-entry", runOnlyAtEntryRule, {
    valid: [
        "const program = Effect.provide(main, layer)",
        "const launched = Layer.launch(layer)",
        { code: "NodeRuntime.runMain(program)", filename: "src/main.ts" },
        { code: "NodeRuntime.runMain(program)", filename: "src/cli.ts" },
        { code: "NodeRuntime.runMain(program)", filename: "bin/trail.ts" },
        {
            code: "NodeRuntime.runMain(program)",
            filename: "src/start.ts",
            options: [{ entryFiles: ["**/start.ts"] }],
        },
    ],
    invalid: [
        {
            code: "const done = Effect.runPromise(program)",
            errors: [{ messageId: "runOutsideEntry", data: { name: "Effect.runPromise" } }],
        },
        {
            code: "NodeRuntime.runMain(program)",
            errors: [{ messageId: "runOutsideEntry", data: { name: "NodeRuntime.runMain" } }],
        },
        {
            code: "NodeRuntime.runMain(program)",
            filename: "src/index.ts",
            errors: [{ messageId: "runOutsideEntry", data: { name: "NodeRuntime.runMain" } }],
        },
        {
            code: "NodeRuntime.runMain(program)",
            filename: "src/main.ts",
            options: [{ entryFiles: ["**/start.ts"] }],
            errors: [{ messageId: "runOutsideEntry", data: { name: "NodeRuntime.runMain" } }],
        },
        {
            code: "const runtime = ManagedRuntime.make(layer)",
            errors: [{ messageId: "runOutsideEntry", data: { name: "ManagedRuntime.make" } }],
        },
        {
            code: "const run = Effect.runSync",
            errors: [{ messageId: "runOutsideEntry", data: { name: "Effect.runSync" } }],
        },
    ],
})
