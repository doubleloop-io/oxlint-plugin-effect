---
title: no-manual-discriminant-comparison
group: Tagged values
---

**Intent**: branching on a union's discriminant goes through an exhaustive match, never through comparisons or `switch`.

```ts
// no
switch (event._tag) {
    case "Created":
        return onCreated(event)
    case "Deleted":
        return onDeleted(event)
}

// yes
Match.value(event).pipe(Match.tagsExhaustive({ Created: onCreated, Deleted: onDeleted }))

// yes, with `discriminants: ["_tag", "type"]`
Match.value(payment).pipe(
    Match.discriminatorsExhaustive("type")({ card: fromCard, transfer: fromTransfer }),
)
```

**Trigger**: an equality comparison between a discriminant (also `["type"]`) and a string literal, or a `switch` on a discriminant. The discriminants are the names in `discriminants`.

**Exemptions and blind spots**: comparisons against a variable rather than a literal. On `_tag`, the handlers covered by [`anti-slop-no-manual-effect-error-tag`](anti-slop-no-manual-effect-error-tag.md): the two never fire on the same node. Guard clauses such as `if (x.type === "a") return …` fire too; on `_tag` use `Predicate.isTagged`. A `_tag` compared with a variant of Effect's own types (`Success`/`Failure` of `Result` and `Exit`, `Left`/`Right`, `Some`/`None`) is reported with their refinement as the remedy, such as `Result.isFailure`: those types cannot gain a variant; a `switch` is reported as usual. An exhaustive ts-pattern match is an equally valid remedy. A name added to `discriminants` also fires on objects outside closed unions (DOM events, external payloads): the list is a choice of the codebase.

**Why**: `Match.tagsExhaustive`, `Match.discriminatorsExhaustive` and `$match` fail to compile when a variant is added; a comparison or a `switch` does not.

**Options**:

- `discriminants`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
