import { RuleTester } from "oxlint/plugins-dev"

import { provideNamedLayerRule } from "./provide-named-layer.ts"

const inlineMerge = "const wired = program.pipe(Effect.provide(Layer.mergeAll(A.layer, B.layer)))"

new RuleTester().run("provide-named-layer", provideNamedLayerRule, {
    valid: [
        "const wired = program.pipe(Effect.provide(fillLayer))",
        "const wired = program.pipe(Effect.provide(NodeServices.layer))",
        "const wired = program.pipe(Effect.provide(planLayer(sheetCsv)))",
        "const wired = program.pipe(Effect.provide(CsvSheetReader.layer(path)))",
        "const wired = Effect.provide(program, appLayer)",
        "const appLayer = Layer.mergeAll(FileRaceList.layer, ProcessAgent.layer)",
        { code: inlineMerge, filename: "src/commands/fill.test.ts" },
        { code: inlineMerge, filename: "test/dryRun.ts" },
        {
            code: inlineMerge,
            filename: "src/commands/fill.check.ts",
            options: [{ testFiles: ["**/*.check.ts"] }],
        },
    ],
    invalid: [
        {
            code: inlineMerge,
            errors: [{ messageId: "inlineLayer" }],
        },
        {
            code: inlineMerge,
            filename: "src/testing/fakes.ts",
            errors: [{ messageId: "inlineLayer" }],
        },
        {
            code: inlineMerge,
            filename: "src/commands/fill.test.ts",
            options: [{ testFiles: ["**/*.check.ts"] }],
            errors: [{ messageId: "inlineLayer" }],
        },
        {
            code: "const wired = Effect.provide(program, Layer.provide(A.layer, B.layer))",
            errors: [{ messageId: "inlineLayer" }],
        },
        {
            code: "const wired = program.pipe(Effect.provide(dryRun ? planLayer : fillLayer))",
            errors: [{ messageId: "inlineLayer" }],
        },
        {
            code: "const wired = program.pipe(Effect.provide(Option.match(csv, { onNone: () => A, onSome: B })))",
            errors: [{ messageId: "inlineLayer" }],
        },
    ],
})
