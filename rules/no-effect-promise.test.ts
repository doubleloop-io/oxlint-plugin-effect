import { RuleTester } from "oxlint/plugins-dev"

import { noEffectPromiseRule } from "./no-effect-promise.ts"

new RuleTester().run("no-effect-promise", noEffectPromiseRule, {
    valid: [
        "const client = Effect.acquireRelease(connect, (client) => Effect.promise(() => client.close()))",
        "const closing = Effect.addFinalizer(() => Effect.promise(() => server.close()))",
        "const read = Effect.acquireUseRelease(open, use, (file) => Effect.promise(() => file.close()))",
    ],
    invalid: [
        {
            code: "const connected = Effect.promise(() => client.connect())",
            errors: [{ messageId: "rejectionAsDefect" }],
        },
        {
            code: "const client = Effect.acquireRelease(Effect.promise(() => pool.connect()), (client) => Effect.promise(() => client.close()))",
            errors: [{ messageId: "rejectionAsDefect" }],
        },
    ],
})
