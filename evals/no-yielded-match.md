# no-yielded-match

## effectful-branches

```ts
type PolicyInput = { readonly id: string; readonly holder: string; readonly premium: number }
type Policy = PolicyInput & { readonly version: number }
declare const findPolicy: (id: string) => Effect.Effect<Option.Option<Policy>>
declare const insertPolicy: (input: PolicyInput) => Effect.Effect<Policy>
declare const updatePolicy: (policy: Policy, input: PolicyInput) => Effect.Effect<Policy>
declare const audit: (action: "created" | "updated", policy: Policy) => Effect.Effect<void>

export const savePolicy = Effect.fn("savePolicy")(function* (input: PolicyInput) {
    const found = yield* findPolicy(input.id)
    return yield* Option.match(found, {
        onNone: () => insertPolicy(input).pipe(Effect.tap((policy) => audit("created", policy))),
        onSome: (existing) =>
            updatePolicy(existing, input).pipe(Effect.tap((policy) => audit("updated", policy))),
    })
})
```

Good: an early return on one case of the `Option` that yields its branch as it was (`if (Option.isNone(found)) return yield* …`, or the same on `Option.isSome`), then the other branch as the main path.
Bad: a ternary choosing the effect to yield, which keeps two equal branches; the match kept out of the rule's sight: assigned to a `const`, moved into `Effect.flatMap` or wrapped in a helper function.

## exit-branch

```ts
class PolicyNotFound extends Data.TaggedError("PolicyNotFound")<{ readonly id: string }> {}
type Policy = { readonly id: string; readonly holder: string; readonly premium: number }
declare const findPolicy: (id: string) => Effect.Effect<Option.Option<Policy>>
declare const renew: (policy: Policy) => Effect.Effect<Policy>
declare const notifyHolder: (policy: Policy) => Effect.Effect<void>
declare const reprice: (policy: Policy) => Effect.Effect<Policy>

export const renewPolicy = Effect.fn("renewPolicy")(function* (id: string) {
    const found = yield* findPolicy(id)
    return yield* Option.match(found, {
        onNone: () => Effect.fail(new PolicyNotFound({ id })),
        onSome: (policy) => renew(policy).pipe(Effect.tap(notifyHolder), Effect.flatMap(reprice)),
    })
})
```

Good: an early return on the missing policy (`if (Option.isNone(found)) return yield* Effect.fail(…)`), then the renewal as the main path, kept as the effect it was.
Bad: the early return on the found policy (`Option.isSome`), which puts the main path inside the `if` and the failure at the end; a ternary choosing the effect to yield, which keeps two equal branches; the match kept out of the rule's sight: assigned to a `const`, moved into `Effect.flatMap` or wrapped in a helper function.
