import { RuleTester } from "oxlint/plugins-dev"

import { noProvideOnDefinitionRule } from "./no-provide-on-definition.ts"

const inLayer = (capture: string, method: string) =>
    `const SvcLive = Layer.effect(Svc, Effect.gen(function* () {
        const ctx = yield* ${capture}
        return Svc.of({ ${method} })
    }))`

const capturedContext = "Effect.context<Repo>()"

const providedGen = "const program = Effect.gen(function* () {}).pipe(Effect.provide(fakes))"

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "no-provide-on-definition",
    noProvideOnDefinitionRule,
    {
        valid: [
            "const wired = printMissing.pipe(Effect.provide(missingLayer))",
            'const wired = printFillSummary(only, "inserite").pipe(Effect.provide(fillLayer))',
            "const wired = Effect.provide(program, appLayer)",
            "const program = Effect.gen(function* () {}).pipe(Effect.map(format))",
            { code: providedGen, filename: "src/commands/missing.test.ts" },
            { code: providedGen, filename: "src/races/__tests__/list.ts" },
            {
                code: providedGen,
                filename: "src/commands/missing.check.ts",
                options: [{ testFiles: ["**/*.check.ts"] }],
            },
            inLayer(
                capturedContext,
                'run: Effect.fn("run")(function* (x) {}, Effect.provide(ctx))',
            ),
            inLayer(
                capturedContext,
                "run: (x) => Effect.gen(function* () {}).pipe(Effect.provide(ctx))",
            ),
            inLayer(
                capturedContext,
                "run: (x) => Effect.provide(Effect.gen(function* () {}), ctx)",
            ),
            inLayer(
                "Effect.context<Repo>().pipe(Effect.map(Context.omit(Tracer.ParentSpan)))",
                'run: Effect.fn("run")(function* (x) {}, Effect.provide(ctx))',
            ),
        ],
        invalid: [
            {
                code: inLayer(
                    "makeContext()",
                    'run: Effect.fn("run")(function* (x) {}, Effect.provide(ctx))',
                ),
                errors: [{ messageId: "provideOnDefinition" }],
            },
            {
                code: inLayer(
                    capturedContext,
                    'run: Effect.fn("run")(function* (x) {}, Effect.provide(RepoLive))',
                ),
                errors: [{ messageId: "provideOnDefinition" }],
            },
            {
                code: "const SvcLive = Layer.effect(Svc, Effect.gen(function* () {}).pipe(Effect.provide(DepLive)))",
                errors: [{ messageId: "provideOnDefinition" }],
            },
            {
                code: providedGen,
                errors: [{ messageId: "provideOnDefinition" }],
            },
            {
                code: providedGen,
                filename: "src/testing/fakeAgent.ts",
                errors: [{ messageId: "provideOnDefinition" }],
            },
            {
                code: "const printMissing = Effect.gen(function* () {}).pipe(Effect.map(format), Effect.provide(missingLayer))",
                errors: [{ messageId: "provideOnDefinition" }],
            },
            {
                code: 'const summary = Effect.fn("summary")(function* () {}, Effect.provide(fillLayer))',
                errors: [{ messageId: "provideOnDefinition" }],
            },
            {
                code: "const printMissing = Effect.provide(Effect.gen(function* () {}), missingLayer)",
                errors: [{ messageId: "provideOnDefinition" }],
            },
        ],
    },
)
