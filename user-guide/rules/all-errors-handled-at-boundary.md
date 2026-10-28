---
title: all-errors-handled-at-boundary
group: Runtime and entry point
---

**Intent**: the entry point runs an Effect whose error channel is closed to `never`.

```ts
// no
export const POST = (request: Request) => Effect.runPromise(createEvent(request))

// yes: in an entry file
export const POST = (request: Request) =>
    Effect.runPromise(createEvent(request) satisfies Effect.Effect<Response, never>)

// yes: a typed helper
const runBoundary = (effect: Effect.Effect<Response, never, never>) => Effect.runPromise(effect)
```

**Trigger**: `Effect.runPromise`, `runSync`, `runFork` and `runCallback` whose argument is not `… satisfies Effect.Effect<A, never>`, a parameter declared with that type, or a program ending in `Effect.result`/`Effect.exit`, or the v3 `Effect.either` (`Effect.result(program)`, `program.pipe(…, Effect.result)`).

**Exemptions and blind spots**: the `*Exit` variants, which return failures as values; `NodeRuntime.runMain`/`BunRuntime.runMain`, which log the Cause and exit with code 1, the right outcome for a process that cannot start; runners inside an `async` function that renders JSX itself, a Server Component, which hands failures to React rather than to an HTTP response; test files, where a rejected run fails the test with the error. The rule checks the shape; `tsc` gives the guarantee.

**Why**: `Effect.runPromise` turns any error left over into a rejected promise, a generic 500. With `never`, a new untranslated error does not compile, and `R = never` forces all Layers to be provided.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
