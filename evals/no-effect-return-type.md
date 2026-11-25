# no-effect-return-type

## literal-object-checked-by-annotation

```ts
class InvalidItem extends Data.TaggedError("InvalidItem")<{ readonly message: string }> {}

export const TransferItem = Schema.Struct({
    type: Schema.Literal("TRANSFER"),
    itemRef: Schema.String,
    vehicle: Schema.String,
    pickupAt: Schema.String,
})
export type TransferItem = typeof TransferItem.Type

type RawTransfer = { readonly ref: string; readonly vehicle: string; readonly pickup?: string }
declare const requirePresent: <A>(
    ref: string,
    field: string,
    value: A | undefined,
) => Effect.Effect<A, InvalidItem>

const toTransferItem = (raw: RawTransfer): Effect.Effect<TransferItem, InvalidItem> =>
    Effect.gen(function* () {
        const pickupAt = yield* requirePresent(raw.ref, "pickup", raw.pickup)
        return { type: "TRANSFER", itemRef: raw.ref, vehicle: raw.vehicle, pickupAt }
    })

export const toTransferItems = (
    raws: ReadonlyArray<RawTransfer>,
): Effect.Effect<ReadonlyArray<TransferItem>, InvalidItem> => Effect.forEach(raws, toTransferItem)
```

Good: the annotation removed and the returned object checked with `satisfies TransferItem`, so `type` stays the literal and every field is still checked.
Bad: `TransferItem.make({ … })`, which throws inside the Effect when the data is invalid; `type: "TRANSFER" as const` alone, which no longer checks the other fields; `toTransferItem` exported to fall under the exemption, widening the module's interface only to silence the rule; a comment suppressing the rule.
