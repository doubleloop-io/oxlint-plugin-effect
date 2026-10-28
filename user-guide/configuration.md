---
title: Configuration
order: 2
---

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

## Configuration options

Three settings describe your project, not a rule, so they are declared once under `settings["dl-effect"]` and every rule that uses them reads them from there. Their defaults fit a Node CLI; on another layout (Next.js, a monorepo) set them before reading the warnings.

- `entryFiles`: the files allowed to run Effects and import adapters. Default `**/main.ts`, `**/cli.ts`, `**/bin/**`.
- `testFiles`: the test files, exempt from the rules that tests legitimately break and the only files `prefer-effect-vitest` checks. Default `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**`.
- `discriminants`: the fields that discriminate a closed union. Default `_tag`; add the ones your unions use, such as `type` or `kind`.

The rules that use each one are listed in [Shared settings](../RULES.md#shared-settings). Set one only where its default does not fit: it **replaces** the default instead of extending it. An unknown key or a value that is not an array of strings stops the lint with an error, so a typo is never silently ignored.

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

The other options and every default are in [Default configuration](default-configuration.md).

To use it with the `@effect/tsgo` presets, see [Alongside `@effect/tsgo`](alongside-effect-tsgo.md).
