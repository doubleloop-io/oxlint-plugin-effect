# no-effect-promise

## sdk-client-wrapper

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

Good: a tagged error for the store (e.g. `ParameterStoreError` carrying the cause), each call lifted with `Effect.tryPromise({ try, catch })` into it, and the service's signatures updated with that error; preferably the four `tryPromise` written out in each method; also accepted, a shared helper wrapping `tryPromise` that the four methods call.
Bad: `Effect.tryPromise(…).pipe(Effect.orDie)` keeping the signatures, which still turns a failure into a defect; the function form `Effect.tryPromise(() => …)` with the generic `UnknownError` in the signatures; a comment suppressing the rule, since the SDK calls can fail.

## decompress-in-match-branches

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

Good: each decompression lifted with `Effect.tryPromise({ try, catch })` into a tagged error carrying the cause; preferably a helper wrapping `tryPromise` that the three branches call, failing with a new tagged error for the decompression (e.g. `DecompressionError`); also accepted, the three `tryPromise` written out, failing with that same new error, and the existing `HttpFailure` reused in the `catch` instead of a new error.
Bad: `Effect.tryPromise(…).pipe(Effect.orDie)`, which still turns a failure into a defect; the function form `Effect.tryPromise(() => …)` with the generic `UnknownError`; a comment suppressing the rule, since decompression can fail on corrupt data.
