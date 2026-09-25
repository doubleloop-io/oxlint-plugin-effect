import { RuleTester } from "oxlint/plugins-dev"

import { singleStylePerFunctionRule } from "./single-style-per-function.ts"

new RuleTester().run("single-style-per-function", singleStylePerFunctionRule, {
    valid: [
        "const POST = (request) => Effect.runPromise(handle(request))",
        "const main = async () => { const response = await fetch(url); return response.json() }",
        "const ping = Effect.tryPromise({ try: async () => { await client.connect() }, catch: toDbError })",
        'const load = Effect.fn("load")(function* () { return yield* Effect.tryPromise({ try: () => fetch(url).then((response) => response.json()), catch: toApiError }) })',
        'test("pings", () => Effect.runPromise(ping))',
        'test("fetches", async () => { const response = await fetch(url); expect(response.ok).toBe(true) })',
    ],
    invalid: [
        {
            code: "const POST = async (request) => { const form = await request.formData(); return Effect.runPromise(Effect.result(create(form))) }",
            errors: [{ messageId: "asyncEffect" }, { messageId: "promiseStep" }],
        },
        {
            code: "const load = (url) => { const body = fetch(url).then((response) => response.json()); return Effect.succeed(body) }",
            errors: [{ messageId: "promiseStep" }],
        },
        {
            code: 'test("rejects duplicates", async () => { await seed(); const result = await run(Effect.result(create(form))); expect(result._tag).toBe("Failure") })',
            errors: [{ messageId: "asyncEffectTest" }],
        },
        {
            code: 'it.each(cases)("rejects %s", async (input) => { expect(await run(Effect.gen(function* () { return yield* create(input) }))).toBeDefined() })',
            errors: [{ messageId: "asyncEffectTest" }],
        },
        {
            code: 'test("loads", () => run(Effect.succeed(1)).then((value) => expect(value).toBe(1)))',
            errors: [{ messageId: "asyncEffectTest" }],
        },
    ],
})
