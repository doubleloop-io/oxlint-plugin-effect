import { RuleTester } from "oxlint/plugins-dev"

import { errorHandlingInEffectFnHandlerRule } from "./error-handling-in-effect-fn-handler.ts"

new RuleTester().run("error-handling-in-effect-fn-handler", errorHandlingInEffectFnHandlerRule, {
    valid: [
        'const create = Effect.fn("create")(function* (request) { return yield* save(request) }, (effect) => effect.pipe(Effect.catchTags({ BadRequest: refuse })))',
        'const create = Effect.fn("create")(function* (request) { return yield* save(request) }, Effect.catchTag("BadRequest", refuse))',
        "Effect.gen(function* () { const raw = yield* fetchThing.pipe(Effect.orElseSucceed(() => fallback)); return yield* decode(raw).pipe(Effect.mapError(toBadRequest)) })",
        "const main = program.pipe(Effect.catch(report))",
        'Layer.effect(Agent, Effect.gen(function* () { const search = Effect.fn("search")(function* (name) { return yield* run(name) }, Effect.catchTag("PlatformError", toAgentError)); return Agent.of({ search }) }))',
    ],
    invalid: [
        {
            code: 'Effect.gen(function* () { return yield* fetchThing.pipe(Effect.catchTag("NotFound", () => Effect.succeed(fallback))) })',
            errors: [{ messageId: "handlerInGenerator", data: { name: "catchTag" } }],
        },
        {
            code: 'Effect.fn("outcome")(function* (name) { const card = yield* Effect.result(search(name)); return card })',
            errors: [{ messageId: "handlerInGenerator", data: { name: "result" } }],
        },
        {
            code: "Effect.gen(function* () { return yield* Effect.forEach(names, (name) => search(name).pipe(Effect.exit)) })",
            errors: [{ messageId: "handlerInGenerator", data: { name: "exit" } }],
        },
    ],
})
