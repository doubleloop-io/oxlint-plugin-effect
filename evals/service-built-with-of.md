# service-built-with-of

## layer-effect-returns-a-literal

```ts
import { Context } from "effect"

type Order = { readonly id: string; readonly email: string }

export class Mailer extends Context.Service<
    Mailer,
    { readonly send: (to: string, subject: string) => Effect.Effect<void> }
>()("Mailer") {}

export class OrderNotifier extends Context.Service<
    OrderNotifier,
    {
        readonly confirmed: (order: Order) => Effect.Effect<void>
        readonly shipped: (order: Order) => Effect.Effect<void>
    }
>()("OrderNotifier") {}

export const OrderNotifierLive = Layer.effect(
    OrderNotifier,
    Effect.gen(function* () {
        const mailer = yield* Mailer
        return {
            confirmed: (order) => mailer.send(order.email, `Order ${order.id} confirmed`),
            shipped: (order) => mailer.send(order.email, `Order ${order.id} shipped`),
        }
    }),
)
```

Good: the returned object wrapped in `OrderNotifier.of({…})`, its content unchanged.
Bad: the object moved into a named factory (`makeOrderNotifier`) that still returns it bare, where the rule no longer looks; the object typed with `satisfies OrderNotifier["Service"]` instead of `.of`, a second form for the same thing.
