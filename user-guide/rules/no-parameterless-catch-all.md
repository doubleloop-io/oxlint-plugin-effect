---
title: no-parameterless-catch-all
group: Error channel
---

**Intent**: errors are caught by tag; a fallback that ignores the error is spelled `orElseSucceed`/`orElse`, never a catch-all with an ignored parameter.

```ts
// no
Effect.catch(() => Effect.succeed(fallback))

// yes
Effect.catchTag("AgentTimeout", () => Effect.succeed(skip))
Effect.catchTag(["ParseError", "ReservedPortError"], () => Effect.succeed(3000))

// yes: every failure truly means the same fallback
Effect.orElseSucceed(() => fallback)
```

**Trigger**: `Effect.catch`, `catchAll`, `catchCause` and `catchEager` with a parameterless handler.

**Exemptions and blind spots**: a catch-all that discriminates on `_tag` by hand: see [`anti-slop-no-manual-effect-error-tag`](anti-slop-no-manual-effect-error-tag.md), and `catch-all-to-map-error`, `catch-all-tag-dispatch-to-catch-tag` and `catch-to-ignore` (effecttsgo).

**Why**: a catch-all that ignores its parameter also swallows the errors added later, which `catchTag` would leave visible in the type.

**Options**: none

**Fix**: none
