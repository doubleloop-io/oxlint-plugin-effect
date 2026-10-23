import { RuleTester } from "oxlint/plugins-dev"

import { noYieldedMatchRule } from "./no-yielded-match.ts"

const inGenerator = (body: string) => `const run = Effect.fn("run")(function* (id) {
    ${body}
})`

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "no-yielded-match",
    noYieldedMatchRule,
    {
        valid: [
            inGenerator(`const policy = yield* findPolicy(id)
    if (Option.isNone(policy)) return yield* register(id)
    return yield* update(policy.value)`),
            // A pure match is not yielded.
            inGenerator(
                "const label = Option.match(name, { onNone: () => 'anonymous', onSome: (n) => n })",
            ),
            // Outside an Effect generator.
            "const f = (o) => Option.match(o, { onNone: () => register, onSome: update })",
            "function* plain() { yield* Option.match(o, { onNone: () => a, onSome: () => b }) }",
            // `option-match-to-from-option` (effecttsgo) covers fail/succeed.
            inGenerator(
                "const policy = yield* Option.match(found, { onNone: () => Effect.fail(new NotFound()), onSome: Effect.succeed })",
            ),
            inGenerator(
                "const policy = yield* found.pipe(Option.match({ onNone: () => Effect.fail(new NotFound()), onSome: (p) => Effect.succeed(p) }))",
            ),
            // `no-nested-match` reports handlers that branch again.
            inGenerator(
                "return yield* Option.match(found, { onNone: () => register, onSome: (p) => Option.match(p.owner, { onNone: () => a, onSome: b }) })",
            ),
            // Other matches are out of the trigger.
            inGenerator("return yield* Exit.match(exit, { onFailure: a, onSuccess: b })"),
        ],
        invalid: [
            {
                code: inGenerator(
                    "return yield* Option.match(policy, { onNone: () => register(id), onSome: (p) => update(p) })",
                ),
                errors: [
                    {
                        messageId: "yieldedMatch",
                        data: { module: "Option", guard: "Option.isNone" },
                    },
                ],
            },
            {
                code: inGenerator(
                    "return yield* findPolicy(id).pipe(Option.match({ onNone: () => Effect.succeed([]), onSome: load }))",
                ),
                errors: [{ messageId: "yieldedMatch" }],
            },
            {
                code: inGenerator(
                    "return yield* pipe(parsed, Result.match({ onFailure: usageError, onSuccess: fill }))",
                ),
                errors: [
                    {
                        messageId: "yieldedMatch",
                        data: { module: "Result", guard: "Result.isFailure" },
                    },
                ],
            },
            {
                // Effect 3.
                code: inGenerator(
                    "return yield* Either.match(parsed, { onLeft: usageError, onRight: fill })",
                ),
                errors: [
                    {
                        messageId: "yieldedMatch",
                        data: { module: "Either", guard: "Either.isLeft" },
                    },
                ],
            },
            {
                // The fail/succeed exemption is the `Effect.fromOption` shape only: Result has none.
                code: `const run = Effect.gen(function* () {
    return yield* Result.match(parsed, { onFailure: (e) => Effect.fail(e), onSuccess: Effect.succeed })
})`,
                errors: [{ messageId: "yieldedMatch" }],
            },
        ],
    },
)
