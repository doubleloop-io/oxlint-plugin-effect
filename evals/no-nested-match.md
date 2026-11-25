# no-nested-match

## inside-generator

```ts
import { Result } from "effect"

class InvalidCommand extends Data.TaggedError("InvalidCommand")<{ readonly reason: string }> {}
type FillCommand = { readonly sheet: string; readonly only: Option.Option<string> }
declare const parseCommand: (
    argv: ReadonlyArray<string>,
) => Result.Result<FillCommand, InvalidCommand>
declare const fillAll: (sheet: string) => Effect.Effect<number>
declare const fillOnly: (sheet: string, name: string) => Effect.Effect<number>

export const run = Effect.fn("run")(function* (argv: ReadonlyArray<string>) {
    return yield* Result.match(parseCommand(argv), {
        onFailure: (error) => Effect.fail(error),
        onSuccess: (command) =>
            Option.match(command.only, {
                onNone: () => fillAll(command.sheet),
                onSome: (name) => fillOnly(command.sheet, name),
            }),
    })
})
```

Good: guard clauses for both choices: an early return on the failed parse (`if (Result.isFailure(parsed)) return yield* Effect.fail(…)`), or the parse yielded with `Effect.fromResult` so a failure ends the generator; then an early return on one case of the `Option`, then the other case as the main path.
Bad: the `Option` choice kept as a match, named in a function (`fill(command)`) or assigned to a `const`; a nested ternary; the outer match kept out of `no-yielded-match`'s sight: assigned to a `const`, moved into `Effect.flatMap` or wrapped in a helper function.

## pure-function

```ts
import { Result } from "effect"

class InvalidQuote extends Data.TaggedError("InvalidQuote")<{ readonly reason: string }> {}
type Quote = { readonly base: number; readonly discount: Option.Option<number> }
declare const parseQuote: (raw: string) => Result.Result<Quote, InvalidQuote>

export const priceLabel = (raw: string) =>
    Result.match(parseQuote(raw), {
        onFailure: (error) => `invalid quote: ${error.reason.trim()}`,
        onSuccess: (quote) =>
            Option.match(quote.discount, {
                onNone: () => `${quote.base}`,
                onSome: (percent) => `${quote.base * (1 - percent / 100)} (-${percent}%)`,
            }),
    })
```

Good: TODO
Bad: TODO
