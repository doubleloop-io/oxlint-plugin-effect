---
title: Troubleshooting
order: 8
---

The problems most often hit when adopting the plugin: each states the symptom, the cause and the fix.

## The lint stops with a settings error

- **Symptom**: oxlint exits with an error naming a `dl-effect` setting before reporting anything.
- **Cause**: a key under `settings["dl-effect"]` is not one of the shared settings, or its value is not an array of strings.
- **Fix**: correct the key or the value as described in [Shared settings](shared-settings.md#setting-a-value).

## Settings are ignored or rejected

- **Symptom**: settings put in a preset in `extends` have no effect, or oxlint rejects settings put in `overrides`.
- **Cause**: oxlint reads settings only from the config that lints.
- **Fix**: move them to that config, as described in [Where settings go](shared-settings.md#where-settings-go).

## Many warnings on correct code

- **Symptom**: on a layout that is not a Node CLI, such as Next.js or a monorepo, many warnings look like false positives, for example Effects run or adapters imported outside the entry files.
- **Cause**: the defaults of `entryFiles` and `testFiles` fit a Node CLI.
- **Fix**: set both for your layout, as described in [Shared settings](shared-settings.md#the-settings).

## No warnings on code that uses aliases

- **Symptom**: a file that breaks the rules gets no warnings.
- **Cause**: the rules recognize literal names only: see [Common limits](common-limits.md).
- **Fix**: import Effect modules under their own names where you want the rules to check the code.
