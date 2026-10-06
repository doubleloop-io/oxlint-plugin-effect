# @doubleloop/oxlint-plugin-effect

An oxlint plugin that enforces a catalog of patterns for Effect 4 code. It currently ships **20 rules**; what each one reports and why is in [`RULES.md`](RULES.md).

| Topic                   | Count | Rules                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error channel           | 5     | [`no-bare-error-in-effect`](RULES.md#no-bare-error-in-effect), [`try-object-form`](RULES.md#try-object-form), [`no-effect-promise`](RULES.md#no-effect-promise), [`no-parameterless-catch-all`](RULES.md#no-parameterless-catch-all), [`error-handling-in-effect-fn-handler`](RULES.md#error-handling-in-effect-fn-handler) |
| Services & Layers       | 3     | [`service-port-shape-only`](RULES.md#service-port-shape-only), [`provide-named-layer`](RULES.md#provide-named-layer), [`no-provide-on-definition`](RULES.md#no-provide-on-definition)                                                                                                                                       |
| Runtime & entrypoint    | 2     | [`run-only-at-entry`](RULES.md#run-only-at-entry), [`boundary-entrypoint-shape`](RULES.md#boundary-entrypoint-shape)                                                                                                                                                                                                        |
| Design & boundaries     | 2     | [`adapter-import-boundary`](RULES.md#adapter-import-boundary), [`no-transport-types-in-generator`](RULES.md#no-transport-types-in-generator)                                                                                                                                                                                |
| Effectful functions     | 3     | [`prefer-effect-fn`](RULES.md#prefer-effect-fn), [`untraced-recursion`](RULES.md#untraced-recursion), [`single-style-per-function`](RULES.md#single-style-per-function)                                                                                                                                                     |
| Code shape              | 4     | [`no-nested-match`](RULES.md#no-nested-match), [`no-inline-yield-star`](RULES.md#no-inline-yield-star), [`no-effect-return-type`](RULES.md#no-effect-return-type), [`no-asymmetric-match-handlers`](RULES.md#no-asymmetric-match-handlers)                                                                                  |
| Config & secrets        | 1     | [`redacted-secret-names`](RULES.md#redacted-secret-names)                                                                                                                                                                                                                                                                   |
| Schema                  | 0     |                                                                                                                                                                                                                                                                                                                             |
| Concurrency & resources | 0     |                                                                                                                                                                                                                                                                                                                             |
| Testing                 | 0     |                                                                                                                                                                                                                                                                                                                             |
| Globals & platform      | 0     |                                                                                                                                                                                                                                                                                                                             |

## Installation

The package is not published: consume it from the checkout as a `link:` dependency.

```bash
pnpm add -D link:<path to the checkout>
```

The link's realpath lies outside `node_modules`, so Node runs the plugin's `.ts` files without compiling them. On publication day only the line in `package.json` changes (`link:…` → a version); the linter config stays the same. Until then `link:` points to a path on this machine: once committed, it breaks installation for anyone without the checkout in the same place.

`oxlint` must match the version of `@oxlint/plugins` in the checkout (currently `1.82.0`): JS plugin compatibility is declared against exact versions.

### Configuration

The `all` preset enables every rule at `warn`, to measure their noise without blocking. A `recommended` preset with reasoned severities will come from measurements on consumers.

With `.oxlintrc.json`:

```json
{ "extends": ["./node_modules/@doubleloop/oxlint-plugin-effect/presets/all.json"] }
```

With `oxlint.config.ts`, where `extends` accepts objects, not paths:

```ts
import dlEffectAll from "@doubleloop/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({ extends: [dlEffectAll] })
```

### Default configuration

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

export default defineConfig({
    // The package exports no entry point: point at the plugin file.
    jsPlugins: ["./node_modules/@doubleloop/oxlint-plugin-effect/index.ts"],
    // Every rule at `warn`, to measure noise without blocking.
    rules: {
        // Error channel
        "dl-effect/no-bare-error-in-effect": "warn",
        "dl-effect/try-object-form": "warn",
        "dl-effect/no-effect-promise": ["warn", { testFiles }],
        "dl-effect/no-parameterless-catch-all": "warn",
        "dl-effect/error-handling-in-effect-fn-handler": ["warn", { testFiles }],
        // Services & Layers
        "dl-effect/service-port-shape-only": "warn",
        "dl-effect/provide-named-layer": ["warn", { testFiles }],
        "dl-effect/no-provide-on-definition": ["warn", { testFiles }],
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
        "dl-effect/no-inline-yield-star": "warn",
        "dl-effect/no-effect-return-type": "warn",
        "dl-effect/no-asymmetric-match-handlers": "warn",
        // Config & secrets
        "dl-effect/redacted-secret-names": "warn",
    },
})
```

To change one option, extend `all` and override only the rules that use it.

## Relationship to `effecttsgo`

These rules are additional to those of [`@effect/tsgo`](https://github.com/Effect-TS/tsgo) (the `effecttsgo` oxlint presets), which use types to cover much of what a syntactic rule cannot see; they target what those presets do not check, and several sections of [`RULES.md`](RULES.md) say where the two families overlap. The `all` preset does not include them: to add them, follow the [Oxlint Setup guide](https://github.com/Effect-TS/tsgo/blob/main/docs/README.md) of `@effect/tsgo`, and put its `extends` **before** `all`.

## Suggested usage

1. **Start small**: enable `all` on a single package or role, not on the whole monorepo. Noise is read one piece at a time.
2. **Reconfigure the layout before reading the numbers**: the defaults of `entryFiles`, `testFiles` and `transportTypes` come from a Node CLI and produce false positives on other layouts. How to do it is in [File options](RULES.md#file-options) and [`no-transport-types-in-generator`](RULES.md#no-transport-types-in-generator).
3. **Turn off structural noise, don't tune it**: a rule that fires everywhere because of the layout (typically [`adapter-import-boundary`](RULES.md#adapter-import-boundary), which reads the filesystem) gets turned off and reported, instead of being chased with ad hoc options.
4. **Raise to `error` only what held up**: the rules that proved stable on your own code. The severity each one ran with in the origin repo is in [`RULES.md`](RULES.md) and is a hint, not a recommendation.

## Development

- `pnpm test`: the `RuleTester`s from `oxlint/plugins-dev` with `node --test`, plus two alignment checks: `presets/all.json` against the plugin's rules, and `RULES.md` with one section per rule.
- `pnpm presets:json`: regenerates `presets/all.json` from `presets/all.ts`, which is the source (the rule list comes from the plugin).
- `pnpm check`: formats with oxfmt, typechecks and tests; run it after every change.
- `pnpm typecheck`, `pnpm format:check`.

A new rule must be registered in `index.ts` and documented in `RULES.md` under a `` ### `rule-name` `` heading; `pnpm presets:json` adds it to the preset.
