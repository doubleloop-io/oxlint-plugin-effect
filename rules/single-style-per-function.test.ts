import { RuleTester } from "oxlint/plugins-dev"

import { singleStylePerFunctionRule } from "./single-style-per-function.ts"

new RuleTester().run("single-style-per-function", singleStylePerFunctionRule, {
    valid: [
        "const POST = (request) => Effect.runPromise(handle(request))",
        "const main = async () => { const response = await fetch(url); return response.json() }",
        "const ping = Effect.tryPromise({ try: async () => { await client.connect() }, catch: toDbError })",
        'const load = Effect.fn("load")(function* () { return yield* Effect.tryPromise({ try: () => fetch(url).then((response) => response.json()), catch: toApiError }) })',
        'test("pings", () => Effect.runPromise(ping))',
        'test("fetches", async () => { const response = await fetch(url); const body = await response.json(); expect(body).toBeDefined() })',
        'test("rejects duplicates", async () => { const result = await run(Effect.result(create(form))); expect(result._tag).toBe("Failure") })',
        'it.each(cases)("rejects %s", async (input) => { expect(await run(Effect.gen(function* () { return yield* create(input) }))).toBeDefined() })',
        'test("reports unhealthy", async () => { const readiness = makeReadiness(Effect.fail("refused")); expect(await Effect.runPromise(readiness.check)).toEqual([]) })',
        "beforeAll(async () => { container = await postgres.start(); url = await container.url() })",
        'test("refuses a forged credential", async () => { const credential = await authority.forge(); const failure = await callApi(credential, (client) => Effect.flip(client.me())); expect(failure).toBeDefined() })',
        "beforeAll(async () => { const connection = await postgres.start(); await Effect.runPromise(Effect.gen(function* () { yield* migrate(connection.url) })) })",
        "afterAll(async () => { await Effect.runPromise(cleanup) })",
        // Helpers in a test file get the allowance of the tests that call them.
        {
            filename: "src/health.test.ts",
            code: "const probe = async (path) => { const { handler, dispose } = toWebHandler(router.pipe(Layer.provide(Layer.succeed(Readiness, { check: Effect.succeed([]) })))); try { return (await handler(new Request(path))).status } finally { await dispose() } }",
        },
        {
            filename: "src/observability.test.ts",
            code: "const captureLines = async (effect, layer) => { const lines = []; await Effect.runPromise(effect.pipe(Effect.provide(layer), Effect.scoped)); return lines }",
        },
        {
            filename: "src/app/events/page.tsx",
            code: "export default async function EventPage() { const visitor = await currentVisitor(); const answer = await Effect.runPromise(Effect.result(loadEvent(visitor))); return <EventView answer={answer} /> }",
        },
    ],
    invalid: [
        {
            filename: "src/app/events/page.tsx",
            code: "export default async function EventsPage() { const visitor = await currentVisitor(); const answer = await Effect.runPromise(Effect.result(loadEvents(visitor))); return answer.events.map((event) => <EventRow event={event} />) }",
            errors: [
                { messageId: "asyncEffect" },
                { messageId: "promiseStep" },
                { messageId: "promiseStep" },
            ],
        },
        {
            code: "const POST = async (request) => { const form = await request.formData(); return Effect.runPromise(Effect.result(create(form))) }",
            errors: [{ messageId: "asyncEffect" }, { messageId: "promiseStep" }],
        },
        {
            code: "const load = (url) => { const body = fetch(url).then((response) => response.json()); return Effect.succeed(body) }",
            errors: [{ messageId: "promiseStep" }],
        },
        {
            code: 'test("loads", () => run(Effect.succeed(1)).then((value) => expect(value).toBe(1)))',
            errors: [{ messageId: "asyncEffectTest" }],
        },
        {
            code: 'test("renames", async () => { const first = await Effect.runPromise(create); const second = await Effect.runPromise(rename(first)); expect(second.name).toBe("renamed") })',
            errors: [{ messageId: "asyncEffectTest" }],
        },
        {
            code: 'test("refuses twice", async () => { await callApi((client) => Effect.flip(client.me())); const failure = await callApi((client) => Effect.flip(client.me())); expect(failure).toBeDefined() })',
            errors: [{ messageId: "asyncEffectTest" }],
        },
        {
            code: "beforeAll(async () => { await Effect.runPromise(migrate); await Effect.runPromise(seed) })",
            errors: [{ messageId: "asyncEffectHook" }],
        },
        {
            filename: "src/events.test.ts",
            code: "const createThenRename = async () => { const first = await Effect.runPromise(create); return Effect.runPromise(rename(first)).then((second) => second.name) }",
            errors: [{ messageId: "asyncEffectHelper" }],
        },
        {
            filename: "src/events.test.ts",
            options: [{ testFiles: ["**/*.check.ts"] }],
            code: "const captureLines = async (effect) => { const lines = []; await Effect.runPromise(effect.pipe(Effect.scoped)); return lines }",
            errors: [{ messageId: "asyncEffect" }, { messageId: "promiseStep" }],
        },
    ],
})
