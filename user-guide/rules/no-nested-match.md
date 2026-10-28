---
title: no-nested-match
group: Code shape
---

**Intent**: a match handler contains neither another match nor a ternary.

```ts
// no
const run = (argv: ReadonlyArray<string>) =>
    Result.match(parseArgs(argv), {
        onFailure: usageError,
        onSuccess: (command) =>
            Option.match(command.only, { onNone: () => fillAll, onSome: fillOnly }),
    })

// yes, outside a generator: a named handler
const fill = (command: CliCommand) =>
    Option.match(command.only, { onNone: () => fillAll, onSome: fillOnly })

const run = (argv: ReadonlyArray<string>) =>
    Result.match(parseArgs(argv), { onFailure: usageError, onSuccess: fill })

// yes, inside a generator: guard clauses
const run = Effect.fn("run")(function* (argv: ReadonlyArray<string>) {
    const parsed = parseArgs(argv)
    if (Result.isFailure(parsed)) return yield* usageError(parsed.failure)

    const { only } = parsed.success
    if (Option.isNone(only)) return yield* fillAll

    return yield* fillOnly(only.value)
})
```

**Trigger**: a handler of `Option.match`, `Result.match`, `Exit.match`, `Either.match`, `$match` or `Match.valueTags` that is itself a data-last match (also `Match.type().pipe(…)` and `pipe(Match.type(), …)`), or that returns a match, a `Match.value(…).pipe(…)` or `pipe(Match.value(…), …)` chain or a ternary.

**Exemptions and blind spots**: `if` inside handlers, and whatever they return from inside an `if` or another nested block; the handlers of an outer `Match.value`/`Match.type` chain; matches nested deeper than the returned value, or assigned to a variable before being returned.

**Why**: two nested levels of choice hide which branch is the normal one.

**Options**: none

**Fix**: none
