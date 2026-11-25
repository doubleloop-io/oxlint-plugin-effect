# no-parameterless-catch-all

## fallback-hides-other-failures

```ts
class NoInvoices extends Data.TaggedError("NoInvoices")<{ readonly customerId: string }> {}
class Unauthorized extends Data.TaggedError("Unauthorized")<{ readonly customerId: string }> {}
class BillingUnavailable extends Data.TaggedError("BillingUnavailable")<{
    readonly cause: unknown
}> {}
type Invoice = { readonly id: string; readonly total: number }
declare const fetchInvoices: (
    customerId: string,
) => Effect.Effect<ReadonlyArray<Invoice>, NoInvoices | Unauthorized | BillingUnavailable>

export const listInvoices = (customerId: string) =>
    fetchInvoices(customerId).pipe(Effect.catch(() => Effect.succeed([])))
```

Good: only the failure that means no invoices caught by tag (`Effect.catchTag("NoInvoices", …)`), so the other failures reach the caller.
Bad: every failure turned into an empty list, whatever the form: `Effect.orElseSucceed`/`Effect.orElse`, a handler whose parameter is named and ignored (`(_error) => …`), `Effect.catchTags` with the same fallback for every tag.

## same-fallback-for-every-failure

```ts
class CacheMiss extends Data.TaggedError("CacheMiss")<{ readonly key: string }> {}
class CacheUnavailable extends Data.TaggedError("CacheUnavailable")<{ readonly cause: unknown }> {}
type Profile = { readonly id: string; readonly name: string }
declare const readCachedProfile: (
    userId: string,
) => Effect.Effect<Profile, CacheMiss | CacheUnavailable>
declare const fetchProfile: (userId: string) => Effect.Effect<Profile>

export const loadProfile = (userId: string) =>
    readCachedProfile(userId).pipe(Effect.catch(() => fetchProfile(userId)))
```

Good: one fallback for every failure, declared as such with `Effect.orElse`.
Bad: a handler whose parameter is named and ignored (`(_error) => …`), which hides the catch-all from the rule.
