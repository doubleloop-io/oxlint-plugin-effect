---
title: no-manual-discriminant-construction
group: Tagged values
---

**Intent**: a union's variant is built by its constructor, never as an object literal with the discriminant.

```ts
// ❌ no
const error = { _tag: "NotFound", id }

// ✅ yes
const error = new NotFound({ id })

// ❌ no, with `discriminants: ["_tag", "eventType"]`
const event = { eventType: "PaymentStarted", id, payment }

// ✅ yes
const event = PaymentStartedEvent.make({ id, payment })
```

**Trigger**: an object literal with a discriminant property (also `"type"` or `["type"]`) whose value is a string literal. The discriminants are the names in `discriminants`.

**Exemptions and blind spots**: values that are not literals (`"Ready" as const` included). Literals that are patterns or raw input, also nested: the arguments of `Match.when`, `Match.not`, of `.with(…)` on a ts-pattern `match(…)` chain, the expected value of an `expect(…)` matcher or `expect.*` helper, the input of `Schema.decode*(X)(…)`/`Schema.encode*(X)(…)`, the argument of `JSON.stringify`, and an argument whose parameter is annotated `unknown` in a function declared in the same file (a fake API's raw body). Transport payloads written as literals fire, as does raw data passed to an imported function or through a variable, and a name added to `discriminants` fires on objects outside closed unions: the list is a choice of the codebase. See `schema-struct-with-tag` (effecttsgo) for `Schema.Struct` with a `_tag` field.

**Why**: a literal skips the constructor, so it carries none of the class's prototype, equality or validation, and drifts silently when the type changes.

**Options**:

- `discriminants`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
