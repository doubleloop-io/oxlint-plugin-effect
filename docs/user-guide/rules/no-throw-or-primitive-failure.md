---
title: no-throw-or-primitive-failure
group: Error channel
---

**Intent**: an expected failure is a tagged error, never a thrown or primitive value.

```ts
// ❌ no
Effect.gen(function* () {
    if (tab === undefined) throw new Error("tab not found")
})
Effect.fail("tab not found")

// ✅ yes
export class SheetTabNotFoundError extends Schema.TaggedError<SheetTabNotFoundError>()(
    "SheetTabNotFoundError",
    { spreadsheetId: Schema.String, message: Schema.String },
) {}

Effect.fail(new SheetTabNotFoundError({ spreadsheetId, message: "tab not found" }))
```

**Trigger**: a `throw` directly inside a generator passed to `Effect.gen`/`Effect.fn`; `Effect.fail` with a literal or a template.

**Exemptions and blind spots**: `Effect.fail` with a literal in test files, where a synthetic failure feeds code generic over the error; a `throw` in a test generator is still reported. A `throw` inside a nested callback. `Effect.fail(new Error(…))` and `class X extends Error`: see `global-error-in-effect-failure` and `extends-native-error` (effecttsgo).

**Why**: the typed error channel discriminates only on tags. A `throw` in the generator becomes a defect, outside the error channel.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
