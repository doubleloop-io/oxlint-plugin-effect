import { RuleTester } from "oxlint/plugins-dev"

import { noTransportTypesInGeneratorRule } from "./no-transport-types-in-generator.ts"

new RuleTester().run("no-transport-types-in-generator", noTransportTypesInGeneratorRule, {
    valid: [
        'const create = Effect.fn("events.create")(function* (request) { return yield* save(request) }, (effect, request) => effect.pipe(Effect.map((created) => Response.redirect(eventUrl(created), 303))))',
        "const toResponse = (created) => new Response(created.id)",
        "Effect.gen(function* () { return yield* new Unauthenticated({ reason }) })",
        {
            code: 'Effect.gen(function* () { return new Response("ok") })',
            options: [{ transportTypes: ["RaceRowDto"] }],
        },
    ],
    invalid: [
        {
            code: 'const create = Effect.fn("events.create")(function* (request) { const credential = yield* session; if (credential === undefined) return Response.redirect(login, 303); return yield* save(credential, request) })',
            errors: [{ messageId: "transportInGenerator", data: { name: "Response" } }],
        },
        {
            code: "Effect.gen(function* () { const created = yield* save; return new NextResponse(created.id) })",
            errors: [{ messageId: "transportInGenerator", data: { name: "NextResponse" } }],
        },
        {
            code: "Effect.gen(function* () { return yield* save.pipe(Effect.map((created) => Response.json(created))) })",
            errors: [{ messageId: "transportInGenerator", data: { name: "Response" } }],
        },
        {
            code: "Effect.gen(function* () { const row = yield* planRow; return new RaceRowDto(row) })",
            options: [{ transportTypes: ["RaceRowDto"] }],
            errors: [{ messageId: "transportInGenerator", data: { name: "RaceRowDto" } }],
        },
    ],
})
