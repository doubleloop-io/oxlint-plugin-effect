---
title: run-only-in-runner
group: Runtime and entry point
---

**Intent**: Effects run only in the program's runner, the entry point.

```ts
// ❌ no
export const check = () => Effect.runPromise(pingDb(url))

// ✅ yes: in main.ts
NodeRuntime.runMain(
    run(process.argv.slice(2)).pipe(Effect.provide(NodeServices.layer)) satisfies Effect.Effect<
        void,
        never
    >,
)
```

**Trigger**: every reference, not just calls, to `Effect.run*`, `NodeRuntime.runMain`, `BunRuntime.runMain` and `ManagedRuntime.make` outside entry files.

**Exemptions and blind spots**: test files, checked by [`prefer-effect-vitest`](prefer-effect-vitest.md) instead.

**Why**: logger, Layers and defect handling are configured in one place.

**Options**:

- `entryFiles`: shared setting, see [Shared settings](../shared-settings.md).
- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
