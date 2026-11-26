# prefer-effect-fn

## combinator-uses-a-parameter

```ts
type CachedResponse = { readonly key: string; readonly body: string }
declare const findCached: (
    collection: string,
    key: string,
) => Effect.Effect<CachedResponse | undefined>
declare const recordMiss: (collection: string) => Effect.Effect<void>

export const loadCachedResponse = (collection: string, key: string) =>
    Effect.gen(function* () {
        yield* Effect.logDebug("cache lookup")
        const cached = yield* findCached(collection, key)
        if (cached === undefined) {
            yield* Effect.logDebug("cache miss")
            yield* recordMiss(collection)
        }
        return cached
    }).pipe(Effect.annotateLogs({ key }))
```

Good: the function became `Effect.fn("loadCachedResponse")` and the annotation moved into its second argument, which receives the effect and the parameters (`(effect, _collection, key) => effect.pipe(Effect.annotateLogs({ key }))`), so every log of the call still carries `key`.
Bad: the exported function stays a wrapper that returns the effect of an inner `Effect.fn`, whose span takes the inner name; an `Effect.gen` nested inside the generator only to keep the `.pipe`, instead of the second argument of `Effect.fn`; the annotation no longer covers every log of the call: moved onto single log calls, dropped, or turned into a span attribute (`Effect.annotateCurrentSpan`).
