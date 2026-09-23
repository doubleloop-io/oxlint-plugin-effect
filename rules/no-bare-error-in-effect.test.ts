import { RuleTester } from "oxlint/plugins-dev"

import { noBareErrorInEffectRule } from "./no-bare-error-in-effect.ts"

new RuleTester().run("no-bare-error-in-effect", noBareErrorInEffectRule, {
    valid: [
        "Effect.gen(function* () { return yield* new TabNotFound({ name }) })",
        "const missing = Effect.fail(new TabNotFound({ name }))",
        'const parsed = Effect.try({ try: () => { throw new Error("boom") }, catch: toParseError })',
        'function parse(text) { throw new Error("boom") }',
    ],
    invalid: [
        {
            code: 'Effect.gen(function* () { throw new Error("tab not found") })',
            errors: [{ messageId: "throwInGenerator" }],
        },
        {
            code: 'const load = Effect.fn("load")(function* (path) { if (!path) throw new TabNotFound({ path }) })',
            errors: [{ messageId: "throwInGenerator" }],
        },
        {
            code: 'const missing = Effect.fail("tab not found")',
            errors: [{ messageId: "primitiveFailure" }],
        },
        {
            code: "const missing = Effect.fail(`tab ${name} not found`)",
            errors: [{ messageId: "primitiveFailure" }],
        },
    ],
})
