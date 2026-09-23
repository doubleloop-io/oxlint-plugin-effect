import { RuleTester } from "oxlint/plugins-dev"

import { singleStylePerFunctionRule } from "./single-style-per-function.ts"

new RuleTester().run("single-style-per-function", singleStylePerFunctionRule, {
    valid: [
        "const POST = (request) => Effect.runPromise(handle(request))",
        "const main = async () => { const response = await fetch(url); return response.json() }",
        "const ping = Effect.tryPromise({ try: async () => { await client.connect() }, catch: toDbError })",
        'const load = Effect.fn("load")(function* () { return yield* Effect.tryPromise({ try: () => fetch(url).then((response) => response.json()), catch: toApiError }) })',
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
    ],
})
