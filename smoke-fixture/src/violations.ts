import { Effect } from "effect"

export const loadUser = Effect.promise(() => fetch("https://example.com/user"))

export const loadOrder = Effect.tryPromise(() => fetch("https://example.com/order"))
