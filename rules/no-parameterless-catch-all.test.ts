import { RuleTester } from "oxlint/plugins-dev"

import { noParameterlessCatchAllRule } from "./no-parameterless-catch-all.ts"

new RuleTester().run("no-parameterless-catch-all", noParameterlessCatchAllRule, {
    valid: [
        "const main = program.pipe(Effect.catch((error) => report(error)))",
        'const skipped = program.pipe(Effect.catchTag("AgentTimeout", () => Effect.succeed(skip)))',
        "const fallback = program.pipe(Effect.orElseSucceed(() => defaults))",
    ],
    invalid: [
        {
            code: "const fallback = program.pipe(Effect.catch(() => Effect.succeed(defaults)))",
            errors: [{ messageId: "swallowed", data: { name: "catch" } }],
        },
        {
            code: "const quiet = Effect.catch(program, () => Effect.void)",
            errors: [{ messageId: "swallowed", data: { name: "catch" } }],
        },
        {
            code: "const quiet = program.pipe(Effect.catchCause(function () { return Effect.void }))",
            errors: [{ messageId: "swallowed", data: { name: "catchCause" } }],
        },
    ],
})
