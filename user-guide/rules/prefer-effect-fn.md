---
title: prefer-effect-fn
group: Effectful functions
---

**Intent**: an effectful function is `Effect.fn("name")`, and a named effect value has a span.

```ts
// no
const outcomeFor = (name: string) => Effect.gen(function* () { … }).pipe(Effect.catch(toFailed))
const refresh = Effect.gen(function* () { … })

// yes: extra combinators as arguments, not .pipe
const outcomeFor = Effect.fn("outcomeFor")(function* (name: string) { … }, Effect.catch(toFailed))
const refresh = Effect.gen(function* () { … }).pipe(Effect.withSpan("refresh"))
```

**Trigger**:

- a declared function, a variable or an object member that only returns `Effect.gen(…)`, even with `.pipe`;
- a variable or an object member whose value is `Effect.gen(…)` without `Effect.withSpan` in its `.pipe`;
- `Effect.fn(body)` without a name;
- `.pipe` on `Effect.fn(…)(…)`.

**Exemptions and blind spots**: `Effect.gen` inline as an argument (`Layer.effect(Tag, Effect.gen(…))`, `Stream.unwrap`, callbacks, `it.effect`). Recursive functions: see [`untraced-recursion`](untraced-recursion.md).

**Why**: named stack traces and spans without wrapper functions. Combinators passed as arguments run inside the function's span and receive its arguments: `(effect, name) => effect.pipe(…)`.

**Options**: none

**Fix**: none
