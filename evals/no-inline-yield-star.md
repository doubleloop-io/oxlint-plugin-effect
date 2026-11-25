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
export const probe = Effect.fn("probe")(function* (
    receiver: Receiver | undefined,
    sample: Effect.Effect<number>,
    unit: number,
) {
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

## short-circuit-condition

```ts
type Verifier = { readonly verify: (token: string) => Effect.Effect<string> }
type FeatureFlags = { readonly isEnabled: (flag: string) => Effect.Effect<boolean> }
declare const isOffline: Effect.Effect<boolean>
declare const remoteVerifier: Verifier

export const makeVerifier = (flags: FeatureFlags) =>
    Effect.gen(function* () {
        if ((yield* isOffline) || !(yield* flags.isEnabled("token-verification"))) {
            return { verify: (token: string) => Effect.succeed(token) } satisfies Verifier
        }
        return remoteVerifier
    })
```

Good: preferably, the first effect bound first and the second one extracted into a named effect that negates its result with `Effect.map`, so the condition is `offline || (yield* verificationDisabled)`; also accepted, nested early returns: bind the first effect, return when it holds, then bind the second one, with the returned value a named constant, not repeated; also accepted, the first effect bound, then the second one yielded as a whole branch of a value ternary (`const enabled = offline ? false : yield* flags.isEnabled(…)`) before a plain `if`.
Bad: both effects bound before the `if`, so the remote flag is read even when offline; Effect combinators (`Effect.if`, `Effect.orElse`, …) instead of the `if`; both checks merged into one effect with `Effect.flatMap` and a ternary (`offline ? Effect.succeed(true) : …`), wherever it is declared, so the short-circuit is no longer read in the `if`; the first effect bound, then a ternary choosing which effect to yield (`offline ? Effect.succeed(true) : …`) before a plain `if`; the negated effect written inline in the condition (`offline || (yield* Effect.map(…))`) instead of named; the returned object written out twice.

## nested-service-effect

```ts
import { Context } from "effect"

type Endpoint = { readonly baseUrl: string; readonly retries: number }
declare const post: (endpoint: Endpoint, path: string, body: unknown) => Effect.Effect<unknown>

export class EndpointSettings extends Context.Service<EndpointSettings, Effect.Effect<Endpoint>>()(
    "EndpointSettings",
) {}

export const sendInvoice = Effect.fn("sendInvoice")(function* (invoice: { readonly id: string }) {
    const endpoint = yield* yield* EndpointSettings
    return yield* post(endpoint, "v1/invoices", invoice)
})

export const sendReminder = Effect.fn("sendReminder")(function* (invoiceId: string) {
    const endpoint = yield* yield* EndpointSettings
    return yield* post(endpoint, "v1/reminders", { invoiceId })
})
```

Good: the service's effect bound in its own statement; preferably two `const`s in each function (`const settings = yield* EndpointSettings; const endpoint = yield* settings`); also accepted, `Effect.flatten(Effect.service(EndpointSettings))`, inline or as a module-level constant both functions use.
Bad: the service's shape changed (e.g. `{ readonly current: Effect<Endpoint> }`), which also changes the Layer that builds it.

## object-literal-fields

```ts
class InvalidField extends Data.TaggedError("InvalidField")<{
    readonly field: string
    readonly value: string
}> {}
type RawShipment = {
    readonly id: string
    readonly carrierRef: string
    readonly pickupAt: string
    readonly pickupDepot: string
    readonly deliveryAt: string
}
declare const carrierCodeFor: (ref: string) => Effect.Effect<string, InvalidField>
declare const parseInstant: (field: string, value: string) => Effect.Effect<Date, InvalidField>

export const toShipment = Effect.fn("toShipment")(function* (raw: RawShipment) {
    return {
        id: raw.id,
        carrier: yield* carrierCodeFor(raw.carrierRef),
        pickup: {
            at: yield* parseInstant("pickupAt", raw.pickupAt),
            depot: raw.pickupDepot,
        },
        deliveryAt: yield* parseInstant("deliveryAt", raw.deliveryAt),
    }
})
```

Good: preferably, one `const` per effect in reading order, then the object built from them; also accepted, the effects gathered in a sequential `Effect.all({ … })` (no `concurrency`), then the object built from its result.
Bad: `Effect.all` with `concurrency`, so with several invalid fields the error returned depends on timing; a helper extracted for the nested `pickup` object, an abstraction for a single field.
