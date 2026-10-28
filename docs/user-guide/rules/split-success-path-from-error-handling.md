---
title: split-success-path-from-error-handling
group: Error channel
---

**Intent**: the generator holds only the happy path; error handling lives in the second argument of `Effect.fn`.

```ts
// ❌ no
function* () {
    const x = yield* fetchThing.pipe(Effect.catchTag("NotFound", () => Effect.succeed(fallback)))
}

// ✅ yes: naming the error or giving an alternative is not handling
function* () {
    const x = yield* fetchThing.pipe(Effect.orElseSucceed(() => fallback))
    const y = yield* decode(raw).pipe(Effect.mapError((error) => new BadRequest({ message: error.message })))
}

// ✅ yes: translation in the second argument, which also receives the original arguments
const createEvent = Effect.fn("events.create")(
    function* (request: Request) { /* success only */ },
    (effect, request) => effect.pipe(Effect.catchTags({ BadRequest: (e) => refused(400, e.message) })),
)
```

**Trigger**: inside a generator passed to `Effect.gen`/`Effect.fn`, callbacks passed to `Effect.*` combinators included, calls to `Effect.catch*` (`catch`, `catchAll`, `catchTag`, `catchTags`, `catchIf`, `catchCause`, `catchDefect`, `catchReason`, …), `either`, `result`, `exit`, `match*` and `sandbox`.

**Exemptions and blind spots**: pipeables of a nested `Effect.fn`. Handlers inside the callback of an iteration (`forEach`, `filter`, `reduce`, `partition`, `validate`, `findFirst`, …): they handle each element on its own, and in the pipeables the first failure would stop the rest. Functions the generator only defines, such as an `HttpApiBuilder` handler or a service method: they are programs of their own. Test files, where the failure is the outcome under observation (`yield* Effect.result(op)` then `expect`). A `catch`, `catchTag`, `catchTags`, `catchIf` or `catchFilter` whose handlers only die (`Effect.die` passed directly or as the sole return): it is a selective `orDie`, declaring the case untracked rather than handling it; a die behind a wrapper or a condition is still reported. A `.pipe(Effect.catch…)` appended to an `Effect.gen` escapes; [`prefer-effect-fn`](prefer-effect-fn.md) closes that gap.

**Why**: translation becomes a single exhaustive point instead of catches scattered along the flow.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
