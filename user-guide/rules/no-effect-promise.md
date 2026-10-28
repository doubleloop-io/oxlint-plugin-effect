---
title: no-effect-promise
group: Error channel
---

**Intent**: a promise that can reject is lifted with [`Effect.tryPromise`](try-object-form.md), not `Effect.promise`.

```ts
// no
Effect.promise(() => client.connect())

// yes
Effect.tryPromise({ try: () => client.connect(), catch: toConnectionError })
```

**Trigger**: `Effect.promise` outside the release step of `acquireRelease`, `acquireUseRelease` and `addFinalizer`.

**Exemptions and blind spots**: the release step, where a promise that cannot reject is the normal case. Test files, where a rejection during setup is a broken test and the defect fails it with the cause. Elsewhere, a promise that truly cannot reject must be suppressed by hand.

**Why**: `Effect.promise` turns a rejection into a defect.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
