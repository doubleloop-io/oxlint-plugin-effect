---
title: single-style-per-function
group: Effectful functions
---

**Intent**: a function is entirely Effect or not Effect at all.

```ts
// ❌ no
export const POST = async (request: Request) => {
    const form = await request.formData()
    const created = await Effect.runPromise(Effect.result(createEvent(form)))
    // …
}

// ✅ yes: promises lifted with Effect.tryPromise
const createEvent = Effect.fn("events.create")(function* (request: Request) {
    const form = yield* Effect.tryPromise({
        try: () => request.formData(),
        catch: () => new BadRequest({ message: "invalid form data" }),
    })
    // …
})
```

**Trigger**: `async`, `await` and `.then(` in a function that builds Effects: an Effect generator, or a function using an `Effect.*` member. A `test`/`it` callback (`.only`, `.each(…)` and the like included) or a `beforeAll`/`afterAll`/`beforeEach`/`afterEach` hook, and in test files any other function except an Effect generator, is reported once, on the function, when more than one of its `await`s, or any `.then(`, involves Effect: has an `Effect.*` member in its expression, nested callbacks and `Effect.run*` included.

**Exemptions and blind spots**: `Effect.run*` alone does not make a function effectful: it is how an async boundary hands over to Effect, and where it may appear is decided by [`run-only-in-runner`](run-only-in-runner.md). An `async` function that renders JSX itself, not only in nested callbacks, is a Server Component: how it turns failures into UI is left to the application. A test, hook or test helper may await promise-based fixtures (a container, an identity provider), then one Effect program, and assert on its result. A step that reaches Effect only through a helper (`await run(seed)`) is not counted.

**Why**: errors travel on two channels, exceptions and Effect, and neither sees them all.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
