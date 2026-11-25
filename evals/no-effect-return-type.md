# no-effect-return-type

## literal-object-checked-by-annotation

```ts
class InvalidItem extends Data.TaggedError("InvalidItem")<{ readonly message: string }> {}

export const TransferItem = Schema.Struct({
    type: Schema.Literal("TRANSFER"),
    itemRef: Schema.String,
    vehicle: Schema.String,
    pickupAt: Schema.String,
}).annotate({ identifier: "TransferItem" })
export type TransferItem = typeof TransferItem.Type

type RawTransfer = { readonly ref: string; readonly vehicle: string; readonly pickup?: string }
declare const requirePresent: <A>(
    ref: string,
    field: string,
    value: A | undefined,
) => Effect.Effect<A, InvalidItem>

const toTransferItem = (raw: RawTransfer): Effect.Effect<TransferItem, InvalidItem> =>
    requirePresent(raw.ref, "pickup", raw.pickup).pipe(
        Effect.map((pickupAt) => ({
            type: "TRANSFER",
            itemRef: raw.ref,
            vehicle: raw.vehicle,
            pickupAt,
        })),
    )

export const toTransferItems = (
    raws: ReadonlyArray<RawTransfer>,
): Effect.Effect<ReadonlyArray<TransferItem>, InvalidItem> => Effect.forEach(raws, toTransferItem)
```

Good: the annotation removed and the returned object checked with `satisfies` against the named type.
Bad: the literal kept with `as const` alone, which moves the check to the exported caller and no longer catches extra fields; a runtime constructor (`TransferItem.make`), which throws inside the Effect on invalid data; the function exported to fall under the exemption; a comment suppressing the rule.
