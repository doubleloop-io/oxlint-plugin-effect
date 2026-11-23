# no-inline-yield-star

## preamble

```ts
class ProbeError extends Data.TaggedError("ProbeError")<{ readonly cause: unknown }> {}
type Report = { readonly bytesReceived: number }
type Receiver = { readonly getStats: () => Promise<Report> }
declare const decoded: (report: Report, unit: number) => number
```

## conditional-branch

```ts
export const probe = (
    receiver: Receiver | undefined,
    sample: Effect.Effect<number>,
    unit: number,
) =>
    Effect.gen(function* () {
        const previous = receiver
            ? decoded(
                  yield* Effect.tryPromise({
                      try: () => receiver.getStats(),
                      catch: (cause) => new ProbeError({ cause }),
                  }),
                  unit,
              )
            : null
        const current = yield* sample
        return { previous, current }
    })
```

Good: a named function wrapping the effect and mapping its result, the branch is `cond ? yield* fn(x) : fallback`; preferably at module level, taking what it uses as parameters, rather than a closure inside the generator.
Bad: a `let` assigned in an `if`; the condition repeated in two ternaries.
