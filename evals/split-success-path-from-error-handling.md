# split-success-path-from-error-handling

## fallback-for-one-step

```ts
class NoLoyaltyAccount extends Data.TaggedError("NoLoyaltyAccount")<{
    readonly customerId: string
}> {}
class PaymentDeclined extends Data.TaggedError("PaymentDeclined")<{ readonly orderId: string }> {}
type Order = { readonly id: string; readonly customerId: string; readonly total: number }
declare const loyaltyDiscount: (customerId: string) => Effect.Effect<number, NoLoyaltyAccount>
declare const charge: (orderId: string, amount: number) => Effect.Effect<string, PaymentDeclined>
declare const sendReceipt: (orderId: string, paymentId: string) => Effect.Effect<void>

export const checkout = Effect.fn("checkout")(function* (order: Order) {
    const discount = yield* loyaltyDiscount(order.customerId).pipe(
        Effect.catchTag("NoLoyaltyAccount", () => Effect.succeed(0)),
    )
    const paymentId = yield* charge(order.id, order.total - discount)
    yield* sendReceipt(order.id, paymentId)
    return paymentId
})
```

Good: the step and its fallback made a named effect declared at module level (`discountFor(customerId)`), so the generator yields it on its success path and the other steps still run.
Bad: the catch moved into the second argument of `Effect.fn`, where the fallback of one step becomes the outcome of the whole function and skips the charge and the receipt; the catch by tag turned into a fallback for any failure (`Effect.orElseSucceed`, `Effect.orElse`); the named effect declared inside the generator, which keeps the error handling there, one level down.

## translation-at-the-end

```ts
class InvalidBody extends Data.TaggedError("InvalidBody")<{ readonly message: string }> {}
class DuplicateEmail extends Data.TaggedError("DuplicateEmail")<{ readonly email: string }> {}
type Response = { readonly status: number; readonly body: unknown }
type Signup = { readonly email: string; readonly name: string }
declare const decodeSignup: (raw: unknown) => Effect.Effect<Signup, InvalidBody>
declare const createAccount: (signup: Signup) => Effect.Effect<string, DuplicateEmail>
declare const respond: (status: number, body: unknown) => Response

export const signupHandler = Effect.fn("signupHandler")(function* (raw: unknown) {
    return yield* Effect.gen(function* () {
        const signup = yield* decodeSignup(raw)
        const accountId = yield* createAccount(signup)
        return respond(201, { accountId })
    }).pipe(
        Effect.catchTags({
            InvalidBody: (error) => Effect.succeed(respond(400, { message: error.message })),
            DuplicateEmail: (error) => Effect.succeed(respond(409, { email: error.email })),
        }),
    )
})
```

Good: the translation moved into the second argument of `Effect.fn` and the inner `Effect.gen` removed, so the generator holds only the success path.
Bad: none expected: this case checks that the message does not spoil an easy fix.
