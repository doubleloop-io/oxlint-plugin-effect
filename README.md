# @doubleloop-io/oxlint-plugin-effect

An oxlint plugin that enforces a catalog of patterns for Effect 4 code.

The rules are written and tested against Effect 4. Where an Effect 3 API has the same intent, the rules recognize its v3 name too: each rule's Trigger in [`RULES.md`](RULES.md) names them.

It complements the type-aware rules of [`@effect/tsgo`](#alongside-effecttsgo): it does not need them, and it checks what they do not.

## Installation

```bash
pnpm add -D @doubleloop-io/oxlint-plugin-effect oxlint
```

Requires Node `^22.20.0 || >=24.8.0` and oxlint `^1.82.0`.

## Configuration

Extend the `all` preset. Prefer `oxlint.config.ts`, where `extends` takes config objects and the preset is imported by package name:

```ts
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({ extends: [dlEffectAll] })
```

With `.oxlintrc.json`, `extends` takes file paths only, so the preset is reached through `node_modules`:

```json
{
    "extends": ["./node_modules/@doubleloop-io/oxlint-plugin-effect/dist/presets/all.json"]
}
```

`all` enables every rule at `warn`, so adopting it never breaks a build: look at the warnings first, then raise to `error` the rules you want to enforce. A `recommended` preset with reasoned severities will come from measurements on real codebases.

To pick rules without the preset, load the plugin by package name and list the rules:

```json
{
    "jsPlugins": ["@doubleloop-io/oxlint-plugin-effect"],
    "rules": {
        "dl-effect/no-effect-promise": "error",
        "dl-effect/try-object-form": "error"
    }
}
```

### Configuration options

Three settings describe your project, not a rule, so they are declared once under `settings["dl-effect"]` and every rule that uses them reads them from there. Their defaults fit a Node CLI; on another layout (Next.js, a monorepo) set them before reading the warnings.

- `entryFiles`: the files allowed to run Effects and import adapters. Default `**/main.ts`, `**/cli.ts`, `**/bin/**`.
- `testFiles`: the test files, exempt from the rules that tests legitimately break and the only files `prefer-effect-vitest` checks. Default `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**`.
- `discriminants`: the fields that discriminate a closed union. Default `_tag`; add the ones your unions use, such as `type` or `kind`.

The rules that use each one are listed in [Shared settings](RULES.md#shared-settings). Set one only where its default does not fit: it **replaces** the default instead of extending it. An unknown key or a value that is not an array of strings stops the lint with an error, so a typo is never silently ignored.

```ts
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({
    extends: [dlEffectAll],
    settings: {
        "dl-effect": { entryFiles: ["apps/web/src/app/**/route.ts", "apps/web/src/runtime.ts"] },
    },
})
```

```json
{
    "extends": ["./node_modules/@doubleloop-io/oxlint-plugin-effect/dist/presets/all.json"],
    "settings": {
        "dl-effect": { "entryFiles": ["apps/web/src/app/**/route.ts", "apps/web/src/runtime.ts"] }
    }
}
```

The package exports the defaults as `defaultEntryFiles`, `defaultTestFiles` and `defaultDiscriminants`: spread them to extend a default (`testFiles: [...defaultTestFiles, "e2e/**"]`).

Settings belong to the config that lints: oxlint does not inherit them from a preset in `extends`, and rejects them in `overrides`. For a value that differs by group of files, use `overrides` on the rules instead.

The other options and every default are in [Default configuration](#default-configuration).

### Alongside `@effect/tsgo`

[`@effect/tsgo`](https://github.com/Effect-TS/tsgo) is the official Effect language service on top of the TypeScript Go compiler; its `effecttsgo` oxlint presets add more than 100 type-aware rules. This plugin does not need it, and its rules target what those presets do not check, so the two complement each other. To use both, follow its [Oxlint Setup guide](https://github.com/Effect-TS/tsgo/blob/main/docs/README.md) and put its preset in `extends` **before** `all`:

```ts
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { recommended as effectTsgoRecommended } from "@effect/tsgo/oxlint-presets"
import { defineConfig } from "oxlint"

export default defineConfig({ extends: [effectTsgoRecommended, dlEffectAll] })
```

```json
{
    "extends": [
        "./node_modules/@effect/tsgo/oxlint-presets/recommended.json",
        "./node_modules/@doubleloop-io/oxlint-plugin-effect/dist/presets/all.json"
    ]
}
```

## Rules

What each rule reports and why is in [`RULES.md`](RULES.md). Report false positives and missed cases in the [GitHub issues](https://github.com/doubleloop-io/oxlint-plugin-effect/issues).

| Topic                | Rules                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error channel        | [`no-throw-or-primitive-failure`](RULES.md#no-throw-or-primitive-failure), [`try-object-form`](RULES.md#try-object-form), [`no-effect-promise`](RULES.md#no-effect-promise), [`no-parameterless-catch-all`](RULES.md#no-parameterless-catch-all), [`split-success-path-from-error-handling`](RULES.md#split-success-path-from-error-handling), [`anti-slop-no-manual-effect-error-tag`](RULES.md#anti-slop-no-manual-effect-error-tag) |
| Tagged values        | [`no-manual-discriminant-comparison`](RULES.md#no-manual-discriminant-comparison), [`no-manual-discriminant-construction`](RULES.md#no-manual-discriminant-construction)                                                                                                                                                                                                                                                               |
| Services & Layers    | [`service-port-shape-only`](RULES.md#service-port-shape-only), [`service-key-matches-name`](RULES.md#service-key-matches-name), [`service-built-with-of`](RULES.md#service-built-with-of), [`provide-named-layer`](RULES.md#provide-named-layer), [`no-provide-on-definition`](RULES.md#no-provide-on-definition), [`anti-slop-no-service-constructor-imports`](RULES.md#anti-slop-no-service-constructor-imports)                     |
| Runtime & entrypoint | [`run-only-in-runner`](RULES.md#run-only-in-runner), [`prefer-effect-vitest`](RULES.md#prefer-effect-vitest), [`all-errors-handled-at-boundary`](RULES.md#all-errors-handled-at-boundary)                                                                                                                                                                                                                                              |
| Design & boundaries  | [`adapter-import-boundary`](RULES.md#adapter-import-boundary), [`no-transport-types-in-generator`](RULES.md#no-transport-types-in-generator)                                                                                                                                                                                                                                                                                           |
| Effectful functions  | [`prefer-effect-fn`](RULES.md#prefer-effect-fn), [`untraced-recursion`](RULES.md#untraced-recursion), [`single-style-per-function`](RULES.md#single-style-per-function)                                                                                                                                                                                                                                                                |
| Code shape           | [`no-nested-match`](RULES.md#no-nested-match), [`no-yielded-match`](RULES.md#no-yielded-match), [`no-inline-yield-star`](RULES.md#no-inline-yield-star), [`no-effect-return-type`](RULES.md#no-effect-return-type), [`no-asymmetric-match-handlers`](RULES.md#no-asymmetric-match-handlers), [`anti-slop-prefer-effect-match`](RULES.md#anti-slop-prefer-effect-match)                                                                 |
| Schema               | [`exported-schema-identifier`](RULES.md#exported-schema-identifier), [`no-inline-schema-codec`](RULES.md#no-inline-schema-codec)                                                                                                                                                                                                                                                                                                       |
| Config & secrets     | [`redacted-secret-names`](RULES.md#redacted-secret-names)                                                                                                                                                                                                                                                                                                                                                                              |

### Absorbed from anti-slop

Some rules come from the Effect rules of [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), MIT-licensed: see [`LICENSE.anti-slop`](LICENSE.anti-slop).

- Imported: [`anti-slop-no-manual-effect-error-tag`](RULES.md#anti-slop-no-manual-effect-error-tag), [`anti-slop-no-service-constructor-imports`](RULES.md#anti-slop-no-service-constructor-imports), [`anti-slop-prefer-effect-match`](RULES.md#anti-slop-prefer-effect-match).
- Superseded: `no-manual-tag-comparison` by [`no-manual-discriminant-comparison`](RULES.md#no-manual-discriminant-comparison), `no-manual-tagged-construction` by [`no-manual-discriminant-construction`](RULES.md#no-manual-discriminant-construction).

## Default configuration

`all` is equivalent to the config below, with every setting and option spelled out at its default. Both **replace** the defaults instead of extending them: see [Shared settings](RULES.md#shared-settings).

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

## Versioning

Versions are `0.x`: any minor release may add, remove or change rules, options, settings and messages.

Supported oxlint is the `peerDependencies` range, `^1.82.0`; CI tests the tarball against `1.82.0`. oxlint's JS plugin API is still experimental, so a newer oxlint minor may break the plugin before the range is narrowed.

## Development

- `pnpm format`: formats with oxfmt; the only script that rewrites sources.
- `pnpm check`: format check, typecheck, lint and tests, writing nothing. The tests are the `RuleTester`s from `oxlint/plugins-dev` with `node --test`, plus an alignment check of `RULES.md` with one section per rule.
- `pnpm build`: compiles to `dist/` and generates `dist/presets/all.json` from `presets/all.ts` (the rule list comes from the plugin).
- `pnpm pack:check`: checks the built preset, then the tarball `npm pack` would publish: only the files in `files`, no local absolute paths, `publint --strict`.
- `pnpm smoke-test`: installs the tarball in `smoke-fixture/` with pnpm and checks the diagnostics of oxlint with each config form: `oxlint.config.ts` and `.oxlintrc.json` with the preset, `.oxlintrc.json` with the plugin by package name.
- `pnpm build-and-pack`: `check`, `build`, `pack:check` and `smoke-test`; run it after every change.
- `pnpm release <bump>`: from a clean `main` equal to `origin/main`, runs `build-and-pack`, bumps with `npm version <bump> --preid rc` (`prerelease` for the next rc, `x.y.z` for a stable), publishes, then pushes the commit and the tag. A prerelease is `next`, and also `latest` until the first stable version; a stable version is `latest` and `next`. A failed publish undoes the bump. Without `<bump>`, prints the version in `package.json` and the npm dist-tags.
- `pnpm build:w`: reruns `pnpm build`, preset included, on every change to `index.ts`, `rules/`, `presets/`, `shared/` or `tsconfig.build.json`; a failed build waits for the next change.
- `pnpm consumer:link <consumer>`: after `pnpm build`, replaces the pnpm symlinks of the plugin in every workspace package of `<consumer>` with links to the checkout, so the consumer's own lint runs the checkout's rules; no tracked file of the consumer changes. `pnpm consumer:unlink <consumer>` restores them with `pnpm install --frozen-lockfile`, as does any `pnpm install` in the consumer.

A new rule must be registered in `index.ts` and documented in `RULES.md` under a `` ### `rule-name` `` heading; `pnpm build` adds it to the preset.
