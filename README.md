# @doubleloop-io/oxlint-plugin-effect

An oxlint plugin that enforces a catalog of patterns for Effect 4 code.

The rules are written and tested against Effect 4. On an Effect 3 codebase most of them do not recognize the APIs and stay silent: silence there is not compliance.

## Install `@effect/tsgo` first

[`@effect/tsgo`](https://github.com/Effect-TS/tsgo) is the official Effect language service on top of the TypeScript Go compiler; its `effecttsgo` oxlint presets ship more than 100 type-aware rules. This plugin is meant to be used alongside them: its rules target what those presets do not check. Set it up with its [Oxlint Setup guide](https://github.com/Effect-TS/tsgo/blob/main/docs/README.md) and put its `extends` **before** this plugin's preset, which does not include it.

## Installation

```bash
pnpm add -D @doubleloop-io/oxlint-plugin-effect oxlint
```

Requires Node `^22.20.0 || >=24.8.0` and oxlint `^1.82.0`.

## Configuration

Extend the `all` preset.

With `.oxlintrc.json`, where `extends` takes file paths:

```json
{
    "extends": ["./node_modules/@doubleloop-io/oxlint-plugin-effect/dist/presets/all.json"]
}
```

With `oxlint.config.ts`, where `extends` takes config objects:

```ts
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({ extends: [dlEffectAll] })
```

`all` enables every rule at `warn`, so adopting it never breaks a build: look at the warnings first, then raise to `error` the rules you want to enforce. A `recommended` preset with reasoned severities will come from measurements on real codebases.

### Configuration options

Two options tell the rules where your files are. Their defaults fit a Node CLI; on another layout (Next.js, a monorepo) set them before reading the warnings.

- `entryFiles`: the files allowed to run Effects and import adapters. Default `**/main.ts`, `**/cli.ts`, `**/bin/**`. Used by `run-only-at-entry` and `adapter-import-boundary`.
- `testFiles`: the files exempt from the rules that tests legitimately break. Default `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**`. Used by `adapter-import-boundary`, `no-effect-promise`, `provide-named-layer`, `no-provide-on-definition`, `error-handling-in-effect-fn-handler` and `anti-slop-no-service-constructor-imports`.

An option **replaces** its default instead of extending it, and every rule that uses it must get the same value. With `oxlint.config.ts`, declare each option once and override the rules that use it after `extends`:

```ts
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

const entryFiles = ["apps/web/src/app/**/route.ts", "apps/web/src/runtime.ts"]
const testFiles = ["**/*.test.ts", "e2e/**"]

export default defineConfig({
    extends: [dlEffectAll],
    rules: {
        "dl-effect/run-only-at-entry": ["warn", { entryFiles }],
        "dl-effect/adapter-import-boundary": ["warn", { entryFiles, testFiles }],
        "dl-effect/no-effect-promise": ["warn", { testFiles }],
        "dl-effect/provide-named-layer": ["warn", { testFiles }],
        "dl-effect/no-provide-on-definition": ["warn", { testFiles }],
        "dl-effect/error-handling-in-effect-fn-handler": ["warn", { testFiles }],
        "dl-effect/anti-slop-no-service-constructor-imports": ["warn", { testFiles }],
    },
})
```

With `.oxlintrc.json` the same overrides go under `rules`, repeating each list in every rule.

The other options and every default are in [Default configuration](#default-configuration).

### Alongside `@effect/tsgo` (optional)

[`@effect/tsgo`](https://github.com/Effect-TS/tsgo) is the official Effect language service on top of the TypeScript Go compiler; its `effecttsgo` oxlint presets add more than 100 type-aware rules. This plugin does not need it, and its rules target what those presets do not check, so the two complement each other. To use both, follow its [Oxlint Setup guide](https://github.com/Effect-TS/tsgo/blob/main/docs/README.md) and put its preset in `extends` **before** `all`:

```json
{
    "extends": [
        "./node_modules/@effect/tsgo/oxlint-presets/recommended.json",
        "./node_modules/@doubleloop-io/oxlint-plugin-effect/dist/presets/all.json"
    ]
}
```

```ts
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { recommended as effectTsgoRecommended } from "@effect/tsgo/oxlint-presets"
import { defineConfig } from "oxlint"

export default defineConfig({ extends: [effectTsgoRecommended, dlEffectAll] })
```

## Rules

What each rule reports and why is in [`RULES.md`](RULES.md).

| Topic                | Rules                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error channel        | [`no-bare-error-in-effect`](RULES.md#no-bare-error-in-effect), [`try-object-form`](RULES.md#try-object-form), [`no-effect-promise`](RULES.md#no-effect-promise), [`no-parameterless-catch-all`](RULES.md#no-parameterless-catch-all), [`error-handling-in-effect-fn-handler`](RULES.md#error-handling-in-effect-fn-handler), [`anti-slop-no-manual-effect-error-tag`](RULES.md#anti-slop-no-manual-effect-error-tag) |
| Tagged values        | [`no-manual-discriminant-comparison`](RULES.md#no-manual-discriminant-comparison), [`no-manual-discriminant-construction`](RULES.md#no-manual-discriminant-construction)                                                                                                                                                                                                                                             |
| Services & Layers    | [`service-port-shape-only`](RULES.md#service-port-shape-only), [`service-key-matches-name`](RULES.md#service-key-matches-name), [`service-built-with-of`](RULES.md#service-built-with-of), [`provide-named-layer`](RULES.md#provide-named-layer), [`no-provide-on-definition`](RULES.md#no-provide-on-definition), [`anti-slop-no-service-constructor-imports`](RULES.md#anti-slop-no-service-constructor-imports)   |
| Runtime & entrypoint | [`run-only-at-entry`](RULES.md#run-only-at-entry), [`boundary-entrypoint-shape`](RULES.md#boundary-entrypoint-shape)                                                                                                                                                                                                                                                                                                 |
| Design & boundaries  | [`adapter-import-boundary`](RULES.md#adapter-import-boundary), [`no-transport-types-in-generator`](RULES.md#no-transport-types-in-generator)                                                                                                                                                                                                                                                                         |
| Effectful functions  | [`prefer-effect-fn`](RULES.md#prefer-effect-fn), [`untraced-recursion`](RULES.md#untraced-recursion), [`single-style-per-function`](RULES.md#single-style-per-function)                                                                                                                                                                                                                                              |
| Code shape           | [`no-nested-match`](RULES.md#no-nested-match), [`no-yielded-match`](RULES.md#no-yielded-match), [`no-inline-yield-star`](RULES.md#no-inline-yield-star), [`no-effect-return-type`](RULES.md#no-effect-return-type), [`no-asymmetric-match-handlers`](RULES.md#no-asymmetric-match-handlers), [`anti-slop-prefer-effect-match`](RULES.md#anti-slop-prefer-effect-match)                                               |
| Schema               | [`exported-schema-identifier`](RULES.md#exported-schema-identifier), [`no-inline-schema-codec`](RULES.md#no-inline-schema-codec)                                                                                                                                                                                                                                                                                     |
| Config & secrets     | [`redacted-secret-names`](RULES.md#redacted-secret-names)                                                                                                                                                                                                                                                                                                                                                            |

### Absorbed from anti-slop

The `anti-slop-*` rules come from the five Effect rules of [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop) (plugin `anti-slop-effect`, commit [`c44ef22`](https://github.com/dmmulroy/anti-slop/tree/c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b/src/effect)), ported into this plugin; its generic TypeScript rules stay out. `no-manual-tag-comparison` and `no-manual-tagged-construction` are retired: [`no-manual-discriminant-comparison`](RULES.md#no-manual-discriminant-comparison) and [`no-manual-discriminant-construction`](RULES.md#no-manual-discriminant-construction) cover them with their default. In the others, detection logic and messages are unchanged; [`anti-slop-no-service-constructor-imports`](RULES.md#anti-slop-no-service-constructor-imports) recognizes test files through the shared [`testFiles`](RULES.md#file-options) option instead of its own `*.test.*`/`*.spec.*` check. Do not enable the `anti-slop-effect` plugin alongside this one: every finding would be reported twice. The original code is MIT-licensed: see [`LICENSE.anti-slop`](LICENSE.anti-slop).

## Default configuration

`all` is equivalent to the config below, with every option spelled out at its default. File options **replace** the defaults instead of extending them, and every rule sharing an option must get the same value: see [File options](RULES.md#file-options).

```ts
import { defineConfig } from "oxlint"

// Files allowed to run Effects (Effect.run*, runMain, ManagedRuntime.make) and to import
// adapters. `index.ts` is left out on purpose: as a barrel it would let adapters leak
// through re-exports.
const entryFiles = ["**/main.ts", "**/cli.ts", "**/bin/**"]

// Files exempt from the rules that tests legitimately break. Helper directories such as
// `src/testing/` are support code, not tests, so they are not matched.
const testFiles = ["**/*.test.*", "**/*.spec.*", "**/__tests__/**", "**/test/**", "**/tests/**"]

// Constructors that must not appear inside an Effect generator: the conversion to the
// transport belongs in the second argument of Effect.fn. Add your own transport DTOs.
const transportTypes = ["Response", "NextResponse"]

// Fields that discriminate a closed union, compared or switched on only through an exhaustive
// match and set only by a constructor. Add the ones your unions use, such as `type` or `kind`.
const discriminants = ["_tag"]

// Schema fields holding a secret: a field matches an entry or ends with it capitalized
// (`password` matches `dbPassword`). No generic `token`: `nextPageToken` is not a secret.
const secretFields = ["password", "secret", "apiKey", "accessToken", "refreshToken", "idToken"]

export default defineConfig({
    // The package exports no entry point: point at the plugin file.
    jsPlugins: ["./node_modules/@doubleloop-io/oxlint-plugin-effect/dist/index.js"],
    // Every rule at `warn`, to measure noise without blocking.
    rules: {
        // Error channel
        "dl-effect/no-bare-error-in-effect": "warn",
        "dl-effect/try-object-form": "warn",
        "dl-effect/no-effect-promise": ["warn", { testFiles }],
        "dl-effect/no-parameterless-catch-all": "warn",
        "dl-effect/error-handling-in-effect-fn-handler": ["warn", { testFiles }],
        "dl-effect/anti-slop-no-manual-effect-error-tag": "warn",
        // Tagged values
        "dl-effect/no-manual-discriminant-comparison": ["warn", { discriminants }],
        "dl-effect/no-manual-discriminant-construction": ["warn", { discriminants }],
        // Services & Layers
        "dl-effect/service-port-shape-only": "warn",
        "dl-effect/service-key-matches-name": "warn",
        "dl-effect/service-built-with-of": "warn",
        "dl-effect/provide-named-layer": ["warn", { testFiles }],
        "dl-effect/no-provide-on-definition": ["warn", { testFiles }],
        "dl-effect/anti-slop-no-service-constructor-imports": ["warn", { testFiles }],
        // Runtime & entrypoint
        "dl-effect/run-only-at-entry": ["warn", { entryFiles }],
        "dl-effect/boundary-entrypoint-shape": "warn",
        // Design & boundaries
        "dl-effect/adapter-import-boundary": ["warn", { entryFiles, testFiles }],
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

To change one option, extend `all` and override only the rules that use it.

## Versioning

Versions are `0.x`: any minor release may add, remove or change rules, options and messages.

Supported oxlint is the `peerDependencies` range, `^1.82.0`; CI tests the tarball against `1.82.0`. oxlint's JS plugin API is still experimental, so a newer oxlint minor may break the plugin before the range is narrowed.

## Development

- `pnpm format`: formats with oxfmt; the only script that rewrites sources.
- `pnpm check`: format check, typecheck, lint and tests, writing nothing. The tests are the `RuleTester`s from `oxlint/plugins-dev` with `node --test`, plus an alignment check of `RULES.md` with one section per rule.
- `pnpm build`: compiles to `dist/` and generates `dist/presets/all.json` from `presets/all.ts` (the rule list comes from the plugin).
- `pnpm pack:check`: checks the built preset, then the tarball `npm pack` would publish: only the files in `files`, no internal names, `publint --strict`.
- `pnpm smoke-test`: installs the tarball in `smoke-fixture/` with pnpm and checks the diagnostics of oxlint with both config forms.
- `pnpm build-and-pack`: `check`, `build`, `pack:check` and `smoke-test`; run it after every change.
- `docs/consumer-loop.md`: how to run a consumer's checks against the checkout, without a release.

A new rule must be registered in `index.ts` and documented in `RULES.md` under a `` ### `rule-name` `` heading; `pnpm build` adds it to the preset.
