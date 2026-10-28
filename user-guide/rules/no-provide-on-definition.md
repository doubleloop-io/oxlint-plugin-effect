---
title: no-provide-on-definition
group: Services and Layers
---

**Intent**: a program does not provide its own Layers; its caller does.

```ts
// no
const printMissing = Effect.gen(function* () { … }).pipe(Effect.provide(missingLayer))

// yes: the program stays unprovided, its caller provides
const printMissing = Effect.gen(function* () { … })
Missing: () => printMissing.pipe(Effect.provide(missingLayer)),
```

**Trigger**: `Effect.provide` applied to `Effect.gen(…)` or to `Effect.fn(…)(…)`, in all three forms: with `.pipe`, as an `Effect.fn` pipeable, data-first.

**Exemptions and blind spots**: test files. A program passed directly to `Effect.run*`, also through `.pipe(…)` or data-first `Effect.*` combinators (`Effect.runPromise(Effect.gen(…).pipe(Effect.provide(layer), Effect.result))`): it is already being dispatched; through any other function it is still reported. A context captured in an enclosing generator with `const ctx = yield* Effect.context<R>()` (also followed by `.pipe(…)`) and handed back to a method of the Layer being built: the caller chose the adapters when it built the Layer. A context obtained through a helper (`yield* contextWithoutSpan()`) is still reported. `provide` on a named program is allowed; `strict-effect-provide` (effecttsgo) reports it too.

**Why**: a program that provides its own Layers can no longer be wired to different adapters by its caller.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
