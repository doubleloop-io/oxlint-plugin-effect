---
title: anti-slop-no-manual-effect-error-tag
group: Error channel
---

**Intent**: a catch handler does not discriminate errors by `_tag`; `catchTag` and `catchReason` do.

```ts
// ❌ no
program.pipe(Effect.catch((error) => (error._tag === "NotFound" ? recover : Effect.fail(error))))

// ✅ yes
program.pipe(Effect.catchTag("NotFound", () => recover))
```

**Trigger**: an equality comparison between `_tag` (or `reason._tag`) and a string literal, or a `switch` on `_tag`, whose nearest enclosing function is a handler passed to `Effect.catch`, `catchAll` or `catchIf`. On `reason._tag` the message proposes `Effect.catchReason(s)`.

**Exemptions and blind spots**: handlers of other combinators (`catchTag`, `catchCause`, `mapError`), and `_tag` checks in a function nested inside the handler. Outside these handlers the same checks belong to [`no-manual-discriminant-comparison`](no-manual-discriminant-comparison.md): the two never fire on the same node.

**Why**: a hand-written dispatch keeps the caught errors in the type even when handled, and silently misses tags added later.

**Options**: none

**Fix**: none

**Origin**: absorbed from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), MIT-licensed: see [`LICENSE.anti-slop`](../../../LICENSE.anti-slop).
