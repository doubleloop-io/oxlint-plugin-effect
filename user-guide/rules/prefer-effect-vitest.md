---
title: prefer-effect-vitest
group: Runtime and entry point
---

**Intent**: tests hand their Effects to `@effect/vitest` instead of running them.

```ts
// ❌ no
test("…", async () => {
    await Effect.runPromise(authorize({ role: "Manager" }))
})

// ✅ yes: fakes as Layers
import { effect } from "@effect/vitest"

effect("…", () => authorize({ role: "Manager" }).pipe(Effect.provide(sheetWith(row))))
```

**Trigger**: the same references as [`run-only-in-runner`](run-only-in-runner.md), inside test files only.

**Exemptions and blind spots**: projects where `@effect/vitest` cannot be found in a `node_modules` from the test file up, since the remedy is out of reach there; scattered runs in their tests go unreported. Every file outside `testFiles`, test helpers such as `src/testing/` included.

**Why**: the test runtime brings `TestClock` and a scope per test, and fixtures provided as Layers replace services where the code reads them.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
