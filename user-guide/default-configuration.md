---
title: Default configuration
order: 5
---

`all` is equivalent to the config below, with every setting and option spelled out at its default. Both **replace** the defaults instead of extending them: see [Shared settings](shared-settings.md).

```ts
import { defineConfig } from "oxlint"

// Constructors that must not appear inside an Effect generator: the conversion to the
// transport belongs in the second argument of Effect.fn. Add your own transport DTOs.
const transportTypes = ["Response", "NextResponse"]

// Schema fields holding a secret: a field matches an entry or ends with it capitalized
// (`password` matches `dbPassword`). No generic `token`: `nextPageToken` is not a secret.
const secretFields = ["password", "secret", "apiKey", "accessToken", "refreshToken", "idToken"]

export default defineConfig({
    jsPlugins: ["@doubleloop-io/oxlint-plugin-effect"],
    settings: {
        "dl-effect": {
            // Files allowed to run Effects (Effect.run*, runMain, ManagedRuntime.make) and to
            // import adapters. `index.ts` is left out on purpose: as a barrel it would let
            // adapters leak through re-exports.
            entryFiles: ["**/main.ts", "**/cli.ts", "**/bin/**"],
            // Files exempt from the rules that tests legitimately break. Helper directories such
            // as `src/testing/` are support code, not tests, so they are not matched.
            testFiles: [
                "**/*.test.*",
                "**/*.spec.*",
                "**/__tests__/**",
                "**/test/**",
                "**/tests/**",
            ],
            // Fields that discriminate a closed union, compared or switched on only through an
            // exhaustive match and set only by a constructor. Add the ones your unions use, such
            // as `type` or `kind`.
            discriminants: ["_tag"],
        },
    },
    // Every rule at `warn`, to measure noise without blocking.
    rules: {
        // Error channel
        "dl-effect/no-throw-or-primitive-failure": "warn",
        "dl-effect/try-object-form": "warn",
        "dl-effect/no-effect-promise": "warn",
        "dl-effect/no-parameterless-catch-all": "warn",
        "dl-effect/split-success-path-from-error-handling": "warn",
        "dl-effect/anti-slop-no-manual-effect-error-tag": "warn",
        // Tagged values
        "dl-effect/no-manual-discriminant-comparison": "warn",
        "dl-effect/no-manual-discriminant-construction": "warn",
        // Services & Layers
        "dl-effect/service-port-shape-only": "warn",
        "dl-effect/service-key-matches-name": "warn",
        "dl-effect/service-built-with-of": "warn",
        "dl-effect/provide-named-layer": "warn",
        "dl-effect/no-provide-on-definition": "warn",
        "dl-effect/anti-slop-no-service-constructor-imports": "warn",
        // Runtime & entrypoint
        "dl-effect/run-only-in-runner": "warn",
        "dl-effect/prefer-effect-vitest": "warn",
        "dl-effect/all-errors-handled-at-boundary": "warn",
        // Design & boundaries
        "dl-effect/adapter-import-boundary": "warn",
        "dl-effect/no-transport-types-in-generator": ["warn", { transportTypes }],
        // Effectful functions
        "dl-effect/prefer-effect-fn": "warn",
        "dl-effect/untraced-recursion": "warn",
        "dl-effect/single-style-per-function": "warn",
        // Code shape
        "dl-effect/no-nested-match": "warn",
        "dl-effect/no-yielded-match": "warn",
        "dl-effect/no-inline-yield-star": "warn",
        "dl-effect/no-effect-return-type": ["warn", { checkExported: false }],
        "dl-effect/no-asymmetric-match-handlers": "warn",
        "dl-effect/anti-slop-prefer-effect-match": "warn",
        // Schema
        "dl-effect/exported-schema-identifier": "warn",
        "dl-effect/no-inline-schema-codec": "warn",
        // Config & secrets
        "dl-effect/redacted-secret-names": ["warn", { secretFields }],
    },
})
```

To change a setting, declare it in `settings`; to change a rule option, extend `all` and override only that rule.
