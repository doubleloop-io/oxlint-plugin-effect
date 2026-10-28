---
title: no-inline-schema-codec
group: Schema
---

**Intent**: a decoder or encoder is a named module-level constant, not built and applied inline.

```ts
// ❌ no
const toPayment = (raw: unknown) => Schema.decodeUnknownSync(PaymentResponse)(raw)

// ✅ yes
const decodePaymentResponse = Schema.decodeUnknownSync(PaymentResponse)

const toPayment = (raw: unknown) => decodePaymentResponse(raw)
```

**Trigger**: an immediate application `Schema.decode*(X)(input)` or `Schema.encode*(X)(input)` (the `Effect`, `Exit`, `Option`, `Promise`, `Result` and `Sync` variants, `Unknown` included) inside a function, test callbacks included.

**Exemptions and blind spots**: module scope, and the generator of `Layer.effect(T, Effect.gen(…))` or `Layer.effect(T)(Effect.gen(…))` (also `Layer.scoped`), which run once; functions nested in that generator, such as the service methods, are checked. Codecs built inside a function and applied later (`const decode = Schema.decodeUnknownEffect(X)`), codecs passed as callbacks (`Effect.flatMap(Schema.decodeUnknownEffect(X))`) and a Layer built through `.pipe(Layer.effect(T))` slip through. Whether the codec should be synchronous is not this rule's concern: see `schema-sync` (effecttsgo).

**Why**: a named codec says what it decodes at the call site and is built once, instead of at every call.

**Options**: none

**Fix**: none
