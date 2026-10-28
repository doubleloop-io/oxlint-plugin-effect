---
title: no-yielded-match
group: Code shape
---

**Intent**: inside an Effect generator, return early on the empty or failed case instead of yielding a match.

```ts
// no
const save = Effect.fn("save")(function* (id: PolicyId) {
    const found = yield* findPolicy(id)
    return yield* Option.match(found, {
        onNone: () => register(id),
        onSome: (policy) => update(policy),
    })
})

// yes
const save = Effect.fn("save")(function* (id: PolicyId) {
    const found = yield* findPolicy(id)
    if (Option.isNone(found)) return yield* register(id)

    return yield* update(found.value)
})
```

**Trigger**: `yield*` of `Option.match(x, {…})` or `Result.match(x, {…})` (v3: `Either.match`), or of a `x.pipe(…)`/`pipe(x, …)` ending in one of them, in the generator of `Effect.gen` or `Effect.fn`.

**Exemptions and blind spots**: an `Option.match` with `onNone` → `Effect.fail(…)` and `onSome` → `Effect.succeed`: see `option-match-to-from-option` (effecttsgo). A handler that `no-nested-match` reports. Matches not yielded directly (assigned first, or inside `Effect.flatMap`) slip through.

**Why**: the match splits the generator into two equal-weight branches; a guard clause leaves one main path of `yield*`.

**Options**: none

**Fix**: none
