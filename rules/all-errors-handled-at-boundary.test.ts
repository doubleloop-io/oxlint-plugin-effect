import { RuleTester } from "oxlint/plugins-dev"

import { allErrorsHandledAtBoundaryRule } from "./all-errors-handled-at-boundary.ts"

const filename = "src/main.ts"

new RuleTester().run("all-errors-handled-at-boundary", allErrorsHandledAtBoundaryRule, {
    valid: [
        // runMain logs the Cause and exits with code 1: the process is the boundary.
        { filename, code: "NodeRuntime.runMain(program.pipe(Effect.provide(layer)))" },
        { filename, code: "Layer.launch(main).pipe(BunRuntime.runMain())" },
        {
            filename,
            code: "const runBoundary = (effect: Effect.Effect<Response, never, never>) => Effect.runPromise(effect)",
        },
        { filename, code: "const exit = await Effect.runPromiseExit(program)" },
        {
            filename,
            code: "const answer = await Effect.runPromise(Effect.result(apiSession(credential)))",
        },
        {
            filename,
            code: "const started = await Effect.runPromise(program.pipe(Effect.provide(layer), Effect.result))",
        },
        { filename, code: "const exit = await Effect.runPromise(program.pipe(Effect.exit))" },
        // Effect 3.
        { filename, code: "const answer = await Effect.runPromise(Effect.either(program))" },
        {
            filename: "src/app/events/page.tsx",
            code: "export default async function EventPage() { const answer = await Effect.runPromise(Effect.result(loadEvent)); return <EventView answer={answer} /> }",
        },
        {
            filename: "src/event-creation.integration.test.ts",
            code: "await Effect.runPromise(runMigrations(appMigrations).pipe(Effect.provide(PgClient.layer(config))))",
        },
        {
            filename: "src/event-creation.check.ts",
            code: "await Effect.runPromise(runMigrations(appMigrations))",
            options: [{ testFiles: ["**/*.check.ts"] }],
        },
    ],
    invalid: [
        {
            filename: "src/app/events/page.tsx",
            code: "export default function EventPage() { const answer = Effect.runSync(loadEvent); return <EventView answer={answer} /> }",
            errors: [{ messageId: "openErrorChannel" }],
        },
        {
            filename,
            code: "export const POST = (request: Request) => Effect.runPromise(createEvent(request))",
            errors: [{ messageId: "openErrorChannel" }],
        },
        {
            filename,
            code: "Effect.runPromise(program.pipe(Effect.result, Effect.flatMap(toResponse)))",
            errors: [{ messageId: "openErrorChannel" }],
        },
        {
            filename,
            code: "Effect.runPromise(program satisfies Effect.Effect<void, AppError>)",
            errors: [{ messageId: "openErrorChannel" }],
        },
        {
            filename,
            code: "const runBoundary = (effect: Effect.Effect<void, AppError>) => Effect.runSync(effect)",
            errors: [{ messageId: "openErrorChannel" }],
        },
        // `testFiles` replaces the defaults, so a `.test.ts` outside the new globs is checked.
        {
            filename: "src/event-creation.integration.test.ts",
            code: "await Effect.runPromise(runMigrations(appMigrations))",
            options: [{ testFiles: ["**/*.check.ts"] }],
            errors: [{ messageId: "openErrorChannel" }],
        },
    ],
})
