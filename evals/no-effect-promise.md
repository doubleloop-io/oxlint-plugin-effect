# no-effect-promise

## service-methods

```ts
import { Context } from "effect"

type ParameterSdk = {
    readonly getParameter: (input: {
        readonly Name: string
    }) => Promise<{ readonly Value?: string }>
    readonly putParameter: (input: {
        readonly Name: string
        readonly Value: string
        readonly Overwrite: boolean
    }) => Promise<unknown>
    readonly deleteParameter: (input: { readonly Name: string }) => Promise<unknown>
}
declare const sdk: ParameterSdk

export class ParameterStore extends Context.Service<
    ParameterStore,
    {
        readonly get: (name: string) => Effect.Effect<string | undefined>
        readonly create: (name: string, value: string) => Effect.Effect<void>
        readonly overwrite: (name: string, value: string) => Effect.Effect<void>
        readonly remove: (name: string) => Effect.Effect<void>
    }
>()("ParameterStore") {
    static readonly layer = Layer.succeed(
        ParameterStore,
        ParameterStore.of({
            get: (Name) =>
                Effect.promise(() => sdk.getParameter({ Name })).pipe(
                    Effect.map((result) => result.Value),
                ),
            create: (Name, Value) =>
                Effect.promise(() => sdk.putParameter({ Name, Value, Overwrite: false })).pipe(
                    Effect.asVoid,
                ),
            overwrite: (Name, Value) =>
                Effect.promise(() => sdk.putParameter({ Name, Value, Overwrite: true })).pipe(
                    Effect.asVoid,
                ),
            remove: (Name) =>
                Effect.promise(() => sdk.deleteParameter({ Name })).pipe(Effect.asVoid),
        }),
    )
}
```

Good: every call lifted with `Effect.tryPromise({ try, catch })` into a tagged error carrying the cause, and the service's signatures declaring that error.
Bad: the failure turned back into a defect (`Effect.orDie`, `Effect.die`) or swallowed; the function form `Effect.tryPromise(() => …)`, whose error is the generic `UnknownError`; a `catch` returning the cause as is; a comment suppressing the rule.

## branches-with-existing-error

```ts
class HttpFailure extends Data.TaggedError("HttpFailure")<{
    readonly url: string
    readonly cause: unknown
}> {}
declare const gunzip: (buffer: ArrayBuffer) => Promise<string>
declare const brotliDecompress: (buffer: ArrayBuffer) => Promise<string>
declare const inflate: (buffer: ArrayBuffer) => Promise<string>

export const decodedBody = (url: string, encoding: string, buffer: ArrayBuffer) =>
    Match.value(encoding).pipe(
        Match.when("gzip", () => Effect.promise(() => gunzip(buffer))),
        Match.when("br", () => Effect.promise(() => brotliDecompress(buffer))),
        Match.when("deflate", () => Effect.promise(() => inflate(buffer))),
        Match.orElse(() =>
            Effect.fail(new HttpFailure({ url, cause: new Error(`Unknown encoding ${encoding}`) })),
        ),
    )
```

Good: every call lifted with `Effect.tryPromise({ try, catch })` into a tagged error carrying the cause, a new one or the one already in scope.
Bad: the failure turned back into a defect (`Effect.orDie`, `Effect.die`) or swallowed; the function form `Effect.tryPromise(() => …)`, whose error is the generic `UnknownError`; a `catch` returning the cause as is; a comment suppressing the rule.
