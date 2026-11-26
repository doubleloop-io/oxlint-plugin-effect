# no-provide-on-definition

## imported-adapter

```ts
import { FetchHttpClient, HttpClient } from "effect/http"

type Rate = { readonly currency: string; readonly value: number }
declare const parseRates: (body: unknown) => Effect.Effect<ReadonlyArray<Rate>>

export const fetchExchangeRates = Effect.fn("fetchExchangeRates")(function* (base: string) {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(`https://rates.example.com/latest?base=${base}`)
    const body = yield* response.json
    return yield* parseRates(body)
}, Effect.provide(FetchHttpClient.layer))
```

Good: the `Effect.provide` removed from the definition, so `fetchExchangeRates` requires `HttpClient` and its caller picks the client.
Bad: the exported function still provides `FetchHttpClient.layer`, moved onto a named inner program; an exported variant already provided (`fetchExchangeRatesLive`) beside the unprovided one, which keeps the choice of the adapter in the module.
