---
title: Shared settings
order: 3
---

Three settings describe your project, not a rule, so they are declared once under `settings["dl-effect"]` in the oxlint config and every rule that uses them reads them from there. Their defaults fit a Node CLI; on another layout (Next.js, a monorepo) set them before reading the warnings.

## The settings

| Setting                                                                          | Default                                                                      | Used by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entryFiles`: the files allowed to run Effects and import adapters               | `**/main.ts`, `**/cli.ts`, `**/bin/**`                                       | [`run-only-in-runner`](rules/run-only-in-runner.md), [`adapter-import-boundary`](rules/adapter-import-boundary.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `testFiles`: the test files, exempt from the rules that tests legitimately break | `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**` | [`run-only-in-runner`](rules/run-only-in-runner.md), [`adapter-import-boundary`](rules/adapter-import-boundary.md), [`no-effect-promise`](rules/no-effect-promise.md), [`provide-named-layer`](rules/provide-named-layer.md), [`no-provide-on-definition`](rules/no-provide-on-definition.md), [`split-success-path-from-error-handling`](rules/split-success-path-from-error-handling.md), [`all-errors-handled-at-boundary`](rules/all-errors-handled-at-boundary.md), [`anti-slop-no-service-constructor-imports`](rules/anti-slop-no-service-constructor-imports.md), [`no-throw-or-primitive-failure`](rules/no-throw-or-primitive-failure.md), [`single-style-per-function`](rules/single-style-per-function.md), [`prefer-effect-vitest`](rules/prefer-effect-vitest.md) |
| `discriminants`: the fields that discriminate a closed union                     | `_tag`                                                                       | [`no-manual-discriminant-comparison`](rules/no-manual-discriminant-comparison.md), [`no-manual-discriminant-construction`](rules/no-manual-discriminant-construction.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

The default `entryFiles` leave out `index.ts` on purpose: it is usually a barrel, and exempting it would let adapters reach the rest of the application through re-exports.

Most rules skip `testFiles` entirely. Three use them differently: [`no-throw-or-primitive-failure`](rules/no-throw-or-primitive-failure.md) skips only primitive failures there, [`single-style-per-function`](rules/single-style-per-function.md) treats their helpers like tests, and [`prefer-effect-vitest`](rules/prefer-effect-vitest.md) checks only them. A helper directory such as `src/testing/` does not count as tests: it is support code.

Add to `discriminants` the fields your unions discriminate on, such as `type` or `kind`.

File globs are matched against the path relative to oxlint's working directory, with `/` on every platform.

## Setting a value

Set one only where its default does not fit: it **replaces** the default instead of extending it. To extend a default in a TypeScript config, spread the one the package exports: `defaultEntryFiles`, `defaultTestFiles` or `defaultDiscriminants`. A JSON config cannot import them: copy the default from the table above. An unknown key or a value that is not an array of strings stops the lint with an error, so a typo is never silently ignored.

```ts
import { defaultTestFiles } from "@doubleloop-io/oxlint-plugin-effect"
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({
    extends: [dlEffectAll],
    settings: {
        "dl-effect": {
            entryFiles: ["apps/web/src/app/**/route.ts", "apps/web/src/runtime.ts"],
            testFiles: [...defaultTestFiles, "e2e/**"],
        },
    },
})
```

```json
{
    "extends": ["./node_modules/@doubleloop-io/oxlint-plugin-effect/dist/presets/all.json"],
    "settings": {
        "dl-effect": {
            "entryFiles": ["apps/web/src/app/**/route.ts", "apps/web/src/runtime.ts"],
            "testFiles": [
                "**/*.test.*",
                "**/*.spec.*",
                "**/__tests__/**",
                "**/test/**",
                "**/tests/**",
                "e2e/**"
            ]
        }
    }
}
```

## Where settings go

Settings belong to the config that lints: oxlint does not inherit them from a preset in `extends`, and rejects them in `overrides`. For a value that differs by group of files, use `overrides` on the rules instead.
