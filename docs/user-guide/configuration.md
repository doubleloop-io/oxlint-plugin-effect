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

## Settings

The settings that describe your project, such as its entry files and test files, are on [Shared settings](shared-settings.md). Their defaults fit a Node CLI: on another layout (Next.js, a monorepo), set them before reading the warnings.

The other options and every default are in [Default configuration](default-configuration.md).

To use it with the `@effect/tsgo` presets, see [Alongside `@effect/tsgo`](alongside-effect-tsgo.md).
