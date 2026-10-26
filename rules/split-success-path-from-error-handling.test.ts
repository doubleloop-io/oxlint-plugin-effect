import { RuleTester } from "oxlint/plugins-dev"

import { splitSuccessPathFromErrorHandlingRule } from "./split-success-path-from-error-handling.ts"

new RuleTester().run(
    "split-success-path-from-error-handling",
    splitSuccessPathFromErrorHandlingRule,
    {
        valid: [
            'const create = Effect.fn("create")(function* (request) { return yield* save(request) }, (effect) => effect.pipe(Effect.catchTags({ BadRequest: refuse })))',
            'const create = Effect.fn("create")(function* (request) { return yield* save(request) }, Effect.catchTag("BadRequest", refuse))',
            "Effect.gen(function* () { const raw = yield* fetchThing.pipe(Effect.orElseSucceed(() => fallback)); return yield* decode(raw).pipe(Effect.mapError(toBadRequest)) })",
            // Functions the generator only defines run as their own programs.
            'Effect.gen(function* () { return handlers.handle("find", ({ params }) => find(params.id).pipe(Effect.catchTags({ UnknownEvent: noSuchEvent }))) })',
            'Effect.gen(function* () { return { bearer: (httpEffect, { credential }) => authenticate(credential).pipe(Effect.catchTag("InvalidCredential", refuse)) } })',
            "const main = program.pipe(Effect.catch(report))",
            // Handling inside an iteration is per element: in the pipeables one failure would stop the batch.
            "Effect.gen(function* () { return yield* Effect.forEach(names, (name) => search(name).pipe(Effect.exit)) })",
            'Effect.fn("publishPending")(function* () { const records = yield* pending; yield* Effect.forEach(records, (record) => publish(record).pipe(Effect.catch(markFailed(record)))) })',
            // Dying is a selective orDie: the case is declared untracked, not handled.
            'Effect.gen(function* () { return yield* readEvent(id).pipe(Effect.catchTag("UnknownEvent", Effect.die)) })',
            'Effect.gen(function* () { return yield* readEvent(id).pipe(Effect.catchTag("UnknownEvent", () => Effect.die(new Error("event vanished")))) })',
            'Effect.gen(function* () { return yield* readEvent(id).pipe(Effect.catchTag("UnknownEvent", (error) => { return Effect.dieMessage(error.message) })) })',
            "Effect.gen(function* () { return yield* query.pipe(Effect.catchTags({ SqlError: Effect.die, SchemaError: Effect.die })) })",
            'Effect.gen(function* () { return yield* Effect.catchTag(readEvent(id), "UnknownEvent", Effect.die) })',

            'Layer.effect(Agent, Effect.gen(function* () { const search = Effect.fn("search")(function* (name) { return yield* run(name) }, Effect.catchTag("PlatformError", toAgentError)); return Agent.of({ search }) }))',
            {
                code: 'test("rejects an expired token", () => run(Effect.gen(function* () { const outcome = yield* Effect.result(verify(token)); expect(outcome._tag).toBe("Failure") })))',
                filename: "src/oidc/token-verifier.test.ts",
            },
            {
                code: "Effect.gen(function* () { const outcome = yield* Effect.result(verify(token)) })",
                filename: "src/oidc/token-verifier.check.ts",
                settings: { "dl-effect": { testFiles: ["**/*.check.ts"] } },
            },
        ],
        invalid: [
            {
                code: 'Effect.gen(function* () { return yield* fetchThing.pipe(Effect.flatMap((thing) => decode(thing).pipe(Effect.catchTag("ParseError", refuse)))) })',
                errors: [{ messageId: "handlerInGenerator", data: { name: "catchTag" } }],
            },
            {
                code: 'Effect.gen(function* () { return yield* fetchThing.pipe(Effect.catchTag("NotFound", () => Effect.succeed(fallback))) })',
                errors: [{ messageId: "handlerInGenerator", data: { name: "catchTag" } }],
            },
            {
                code: "Effect.gen(function* () { return yield* query.pipe(Effect.catchTags({ SqlError: Effect.die, NotFound: () => Effect.succeed(fallback) })) })",
                errors: [{ messageId: "handlerInGenerator", data: { name: "catchTags" } }],
            },
            {
                code: 'Effect.gen(function* () { return yield* readEvent(id).pipe(Effect.catchTag("UnknownEvent", (error) => { log(error); return Effect.die(error) })) })',
                errors: [{ messageId: "handlerInGenerator", data: { name: "catchTag" } }],
            },
            {
                code: "Effect.gen(function* () { return yield* readEvent(id).pipe(Effect.catchDefect(Effect.die)) })",
                errors: [{ messageId: "handlerInGenerator", data: { name: "catchDefect" } }],
            },
            {
                code: 'Effect.fn("outcome")(function* (name) { const card = yield* Effect.result(search(name)); return card })',
                errors: [{ messageId: "handlerInGenerator", data: { name: "result" } }],
            },
            {
                code: "Effect.gen(function* () { const outcome = yield* Effect.result(verify(token)) })",
                filename: "src/oidc/token-verifier.test.ts",
                settings: { "dl-effect": { testFiles: ["**/*.check.ts"] } },
                errors: [{ messageId: "handlerInGenerator", data: { name: "result" } }],
            },
        ],
    },
)
