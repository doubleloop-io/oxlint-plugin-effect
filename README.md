# @doubleloop-io/oxlint-plugin-effect

An oxlint plugin that enforces a catalog of patterns for Effect 4 code.

The rules are written and tested against Effect 4. Where an Effect 3 API has the same intent, the rules recognize its v3 name too: each rule's Trigger names them. The [Rules overview](https://doubleloop-io.github.io/oxlint-plugin-effect/rules-overview/) lists every rule.

It complements the type-aware rules of [`@effect/tsgo`](https://doubleloop-io.github.io/oxlint-plugin-effect/alongside-effect-tsgo/): it does not need them, and it checks what they do not.

## Installation

```bash
pnpm add -D @doubleloop-io/oxlint-plugin-effect oxlint
```

Requires Node `^22.20.0 || >=24.8.0` and oxlint `^1.82.0`. What a release may change and which oxlint versions are supported: [Versioning](https://doubleloop-io.github.io/oxlint-plugin-effect/versioning/).

## Usage

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

`all` enables every rule at `warn`, so adopting it never breaks a build: look at the warnings first, then raise to `error` the rules you want to enforce.

**Set `entryFiles` before reading the warnings** on a layout that is not a Node CLI, such as Next.js or a monorepo. Its default, `**/main.ts`, `**/cli.ts`, `**/bin/**`, decides which files may run Effects and import adapters, so on another layout it turns correct code into warnings. How to set it: [Shared settings](https://doubleloop-io.github.io/oxlint-plugin-effect/shared-settings/#setting-a-value).

## Documentation

The guide is on the [website](https://doubleloop-io.github.io/oxlint-plugin-effect/):

- [Configuration](https://doubleloop-io.github.io/oxlint-plugin-effect/configuration/): the `all` preset and picking rules.
- [Shared settings](https://doubleloop-io.github.io/oxlint-plugin-effect/shared-settings/): the settings that describe your project, their defaults and the rules that use them.
- [Default configuration](https://doubleloop-io.github.io/oxlint-plugin-effect/default-configuration/): `all` with every setting and option spelled out.
- [Alongside `@effect/tsgo`](https://doubleloop-io.github.io/oxlint-plugin-effect/alongside-effect-tsgo/): combining its presets with this one.
- [Rules overview](https://doubleloop-io.github.io/oxlint-plugin-effect/rules-overview/): every rule, grouped by topic.
- [Versioning](https://doubleloop-io.github.io/oxlint-plugin-effect/versioning/): what a release may change.

Coding agents: the same pages ship in the package under `user-guide/`, starting from `user-guide/README.md`.
