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

Good: the effect and the transformation of its result moved into a named function, so the branch is a single `yield*` (`cond ? yield* fn(x) : fallback`).
Bad: a `let` assigned in an `if`; the condition repeated in two ternaries.

## short-circuit-condition

```ts
type Verifier = { readonly verify: (token: string) => Effect.Effect<string> }
type FeatureFlags = { readonly isEnabled: (flag: string) => Effect.Effect<boolean> }
declare const isOffline: Effect.Effect<boolean>
declare const remoteVerifier: Verifier

export const makeVerifier = Effect.fn("makeVerifier")(function* (flags: FeatureFlags) {
    if ((yield* isOffline) || !(yield* flags.isEnabled("token-verification"))) {
        return { verify: (token: string) => Effect.succeed(token) } satisfies Verifier
    }
    return remoteVerifier
})
```

Good: the first effect bound first, and the second one run only when needed, as a named effect yielded on the right of `||` (negated inside with `Effect.map`), behind an early return, or as the `yield*` branch of a value ternary (`offline ? false : yield* …`).
Bad: both effects bound before the `if`, so the second one runs even when the first holds; both checks merged into one effect, wherever it is declared (`Effect.flatMap`, `Effect.if`, a generator with an early return), so the `if` no longer reads the short-circuit; a ternary of effects (`offline ? Effect.succeed(true) : …`); the negation written inline (`yield* Effect.map(…)`) instead of named; the returned object written twice.

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

Good: the service's effect bound in its own statement (`const settings = yield* EndpointSettings`, then `yield* settings`), or flattened with `Effect.flatten`.
Bad: the service's shape changed, which also changes the Layer that builds it.

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

Good: the effects bound in reading order, one `const` each or a sequential `Effect.all`, then the object built from them.
Bad: `Effect.all` with `concurrency`, so which error comes out depends on timing; a helper extracted for a single field.
