---
title: Alongside `@effect/tsgo`
order: 3
---

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
