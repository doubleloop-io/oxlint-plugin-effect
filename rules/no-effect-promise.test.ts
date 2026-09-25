import { RuleTester } from "oxlint/plugins-dev"

import { noEffectPromiseRule } from "./no-effect-promise.ts"

new RuleTester().run("no-effect-promise", noEffectPromiseRule, {
    valid: [
        "const client = Effect.acquireRelease(connect, (client) => Effect.promise(() => client.close()))",
        "const closing = Effect.addFinalizer(() => Effect.promise(() => server.close()))",
        "const read = Effect.acquireUseRelease(open, use, (file) => Effect.promise(() => file.close()))",
        {
            code: "const credential = Effect.promise(() => authority.credentialFor(claims))",
            filename: "src/oidc/token-verifier.test.ts",
        },
        {
            code: "const credential = Effect.promise(() => authority.credentialFor(claims))",
            filename: "src/oidc/token-verifier.check.ts",
            options: [{ testFiles: ["**/*.check.ts"] }],
        },
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
        // `testFiles` replaces the defaults, so a `.test.ts` outside the new globs is checked.
        {
            code: "const credential = Effect.promise(() => authority.credentialFor(claims))",
            filename: "src/oidc/token-verifier.test.ts",
            options: [{ testFiles: ["**/*.check.ts"] }],
            errors: [{ messageId: "rejectionAsDefect" }],
        },
    ],
})
