---
title: no-transport-types-in-generator
group: Design and boundaries
---

**Intent**: the generator returns a domain value; conversion to a transport type happens in the second argument of `Effect.fn`.

```ts
// no: an error branch inside the happy path
function* (request: Request) {
    const credential = yield* sessionCredential
    if (credential === undefined) return Response.redirect(new URL("/login", origin), 303)
    // …
}

// yes
const createEvent = Effect.fn("events.create")(
    function* (request: Request) {
        const credential = yield* sessionCredential // fails with Unauthenticated
        const submission = yield* form(request)
        return yield* apiCreateEvent(credential, submission)
    },
    (effect, request) =>
        effect.pipe(
            Effect.map((created) => Response.redirect(eventUrl(request, created), 303)),
            Effect.catchTags({ Unauthenticated: () => Effect.succeed(toLogin(request)) }),
        ),
)
```

**Trigger**: `new T(…)`, `T.method(…)` and `T(…)` inside an Effect generator, callbacks passed to `Effect.*` combinators included, when `T` is a transport type.

**Exemptions and blind spots**: pipeables of `Effect.fn`, where the conversion must live. Functions the generator only defines, such as an HTTP handler it registers. `return yield* new Unauthenticated(…)` is a declared failure. An early `return` of a domain value that actually signals an error is indistinguishable from a success.

**Why**: an early `return new Response(…)` on the happy path is an error branch disguised as success, and escapes exhaustive translation.

**Options**:

- `transportTypes`: default `["Response", "NextResponse"]`, replaced by the configured list. Add your own transport DTOs.

**Fix**: none
