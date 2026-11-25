# no-manual-discriminant-construction

## optional-result-by-hand

```ts
type Rate = { readonly currency: string; readonly value: number }
type Lookup<A> = { readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: A }
declare const rates: ReadonlyMap<string, Rate>

export const findRate = (currency: string): Lookup<Rate> => {
    const rate = rates.get(currency)
    return rate === undefined ? { _tag: "None" } : { _tag: "Some", value: rate }
}
```

Good: Effect's `Option` in place of the hand-written union, built with its constructors (`Option.some`/`Option.none`, `Option.fromUndefinedOr`); a `Lookup` alias of `Option.Option` is fine.
Bad: `Option` rebuilt by hand with any constructor (`Data.taggedEnum`, tagged classes, `Schema`), which loses Effect's `Option` functions; the union dropped for `Rate | undefined`, which gives up the typed absence; the literals kept and hidden from the rule (`as const`, the tag in a variable).

## fallible-result-by-hand

```ts
class InvalidAmount extends Data.TaggedError("InvalidAmount")<{ readonly input: string }> {}
type Parsed<A, E> =
    | { readonly _tag: "Failure"; readonly failure: E }
    | { readonly _tag: "Success"; readonly success: A }

export const parseAmount = (input: string): Parsed<number, InvalidAmount> => {
    const amount = Number(input.trim())
    return input.trim() !== "" && Number.isFinite(amount)
        ? { _tag: "Success", success: amount }
        : { _tag: "Failure", failure: new InvalidAmount({ input }) }
}
```

Good: Effect's `Result` in place of the hand-written union, built with `Result.succeed`/`Result.fail`; a `Parsed` alias of `Result.Result` is fine.
Bad: `Exit` in place of `Result`, an outcome of running an effect used as a value; the function turned into an effect (`Effect.succeed`/`Effect.fail`), which changes every caller; `Result` rebuilt by hand with any constructor (`Data.taggedEnum`, tagged classes, `Schema`); the error dropped for `undefined` or a `throw`; the literals kept and hidden from the rule (`as const`, the tag in a variable).
