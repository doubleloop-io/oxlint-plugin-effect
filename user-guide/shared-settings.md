---
title: Shared settings
order: 3
---

Three settings describe your project, not a rule, so they are declared once under `settings["dl-effect"]` in the oxlint config and every rule that uses them reads them from there. Their defaults fit a Node CLI; on another layout (Next.js, a monorepo) set them before reading the warnings.

## The settings

- **`entryFiles`**: the files allowed to run Effects and import adapters.
    - used by:
        - [`run-only-in-runner`](../RULES.md#run-only-in-runner)
        - [`adapter-import-boundary`](../RULES.md#adapter-import-boundary)
    - default: `**/main.ts`, `**/cli.ts`, `**/bin/**`. `index.ts` is excluded on purpose: it is usually a barrel, and exempting it would let adapters reach the rest of the application through re-exports.
- **`testFiles`**: the test files, exempt from the rules that tests legitimately break and the only files `prefer-effect-vitest` checks.
    - used by:
        - [`run-only-in-runner`](../RULES.md#run-only-in-runner), [`adapter-import-boundary`](../RULES.md#adapter-import-boundary), [`no-effect-promise`](../RULES.md#no-effect-promise), [`provide-named-layer`](../RULES.md#provide-named-layer), [`no-provide-on-definition`](../RULES.md#no-provide-on-definition), [`split-success-path-from-error-handling`](../RULES.md#split-success-path-from-error-handling), [`all-errors-handled-at-boundary`](../RULES.md#all-errors-handled-at-boundary), [`anti-slop-no-service-constructor-imports`](../RULES.md#anti-slop-no-service-constructor-imports): skip test files
        - [`no-throw-or-primitive-failure`](../RULES.md#no-throw-or-primitive-failure): skips only primitive failures there
        - [`single-style-per-function`](../RULES.md#single-style-per-function): treats their helpers like tests
        - [`prefer-effect-vitest`](../RULES.md#prefer-effect-vitest): checks only them
    - default: `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**`. A helper directory such as `src/testing/` does not count as tests: it is support code.
- **`discriminants`**: the fields that discriminate a closed union.
    - used by:
        - [`no-manual-discriminant-comparison`](../RULES.md#no-manual-discriminant-comparison)
        - [`no-manual-discriminant-construction`](../RULES.md#no-manual-discriminant-construction)
    - default: `_tag`. Add the fields your unions discriminate on, such as `type` or `kind`.

File globs are matched against the path relative to oxlint's working directory, with `/` on every platform.

## Setting a value

Set one only where its default does not fit: it **replaces** the default instead of extending it. An unknown key or a value that is not an array of strings stops the lint with an error, so a typo is never silently ignored.

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

## Where settings go

Settings belong to the config that lints: oxlint does not inherit them from a preset in `extends`, and rejects them in `overrides`. For a value that differs by group of files, use `overrides` on the rules instead.
