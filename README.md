# better-effect

An oxlint plugin that enforces a catalog of patterns for Effect 4 code. The rules add to those already in [`@effect/tsgo`](https://github.com/Effect-TS/tsgo) (`effecttsgo` presets) and cover what those cannot see. The 20 rules, with what they report and why, are in [`RULES.md`](RULES.md).

## Installation

The package is not published: consume it from the checkout as a `link:` dependency.

```bash
pnpm add -D link:<path to the checkout>
```

The link's realpath lies outside `node_modules`, so Node runs the plugin's `.ts` files without compiling them. On publication day only the line in `package.json` changes (`link:…` → a version); the linter config stays the same. Until then `link:` points to a path on this machine: once committed, it breaks installation for anyone without the checkout in the same place.

`oxlint` must match the version of `@oxlint/plugins` in the checkout (currently `1.82.0`): JS plugin compatibility is declared against exact versions.

## Configuration

The `all` preset enables every rule at `warn`, to measure their noise without blocking. A `recommended` preset with reasoned severities will come from measurements on consumers.

With `.oxlintrc.json`:

```json
{ "extends": ["./node_modules/@iacoware/better-effect/presets/all.json"] }
```

With `oxlint.config.ts`, where `extends` accepts objects, not paths:

```ts
import betterEffectAll from "@iacoware/better-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({ extends: [betterEffectAll] })
```

Oxlint rejects `.oxlintrc.json` and `oxlint.config.ts` in the same directory.

### Optional `effecttsgo` presets

`all` does not include the `@effect/tsgo` presets, which use types to cover much of what these rules cannot see; several sections of `RULES.md` say where the two families overlap. To enable them, the consumer adds the five `extends` from `@effect/tsgo/oxlint-presets/` **before** `all` — `antipattern`, `correctness`, `effect-native`, `style`, and `recommended` last, because it raises severities — plus the script `"prepare": "effect-tsgo patch --oxlint"`: without the patch oxlint rejects the presets with `Unknown plugin: 'effecttsgo'`.

## Suggested usage

1. **Start small**: enable `all` on a single package or role, not on the whole monorepo. Noise is read one piece at a time.
2. **Reconfigure the layout before reading the numbers**: the defaults of `entryFiles`, `testFiles` and `transportTypes` come from a Node CLI and produce false positives on other layouts. How to do it is in [File options](RULES.md#file-options) and [`no-transport-types-in-generator`](RULES.md#no-transport-types-in-generator).
3. **Turn off structural noise, don't tune it**: a rule that fires everywhere because of the layout (typically [`adapter-import-boundary`](RULES.md#adapter-import-boundary), which reads the filesystem) gets turned off and reported, instead of being chased with ad hoc options.
4. **Raise to `error` only what held up**: the rules that proved stable on your own code. The severity each one ran with in the origin repo is in [`RULES.md`](RULES.md) and is a hint, not a recommendation.

## Development

- `pnpm test`: the `RuleTester`s from `oxlint/plugins-dev` with `node --test`, plus two alignment checks: `presets/all.json` against the plugin's rules, and `RULES.md` with one section per rule.
- `pnpm presets:json`: regenerates `presets/all.json` from `presets/all.ts`, which is the source (the rule list comes from the plugin).
- `pnpm typecheck`, `pnpm format:check`.

A new rule must be registered in `index.ts` and documented in `RULES.md` under a `` ### `rule-name` `` heading; `pnpm presets:json` adds it to the preset.
