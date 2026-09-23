import { RuleTester } from "oxlint/plugins-dev"

import { tryObjectFormRule } from "./try-object-form.ts"

new RuleTester().run("try-object-form", tryObjectFormRule, {
    valid: [
        "const sheet = Effect.tryPromise({ try: () => api.get(id), catch: toSheetError(id) })",
        "const parsed = Effect.try({ try: () => JSON.parse(text), catch: toParseError })",
    ],
    invalid: [
        {
            code: "const sheet = Effect.tryPromise(() => api.get(id))",
            errors: [{ messageId: "objectForm", data: { name: "tryPromise" } }],
        },
        {
            code: "const parsed = Effect.try(() => JSON.parse(text))",
            errors: [{ messageId: "objectForm", data: { name: "try" } }],
        },
        {
            code: "const sheet = Effect.tryPromise(request)",
            errors: [{ messageId: "objectForm", data: { name: "tryPromise" } }],
        },
    ],
})
