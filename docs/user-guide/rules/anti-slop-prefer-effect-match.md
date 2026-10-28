---
title: anti-slop-prefer-effect-match
group: Code shape
---

**Intent**: a choice among several literal values of the same expression is a `Match`, not a chain of ternaries.

```ts
// ❌ no
const label = kind === "a" ? "A" : kind === "b" ? "B" : "Other"

// ✅ yes
const label = Match.value(kind).pipe(
    Match.when("a", () => "A"),
    Match.when("b", () => "B"),
    Match.orElse(() => "Other"),
)
```

**Trigger**: a ternary chain of at least two levels where every condition compares the same expression, by source text, with a literal (`==`, `===`, `!=`, `!==`).

**Exemptions and blind spots**: a single ternary, chains comparing different expressions, and the same expression written differently (`a.b` vs `a["b"]`). A chain returned by a match handler also fires [`no-nested-match`](no-nested-match.md): extract the handler first, since a `Match.value` left inside it fires `no-nested-match` again.

**Why**: a ternary chain hides which value is the fallback and cannot be made exhaustive.

**Options**: none

**Fix**: none

**Origin**: absorbed from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), MIT-licensed: see [`LICENSE.anti-slop`](../../../LICENSE.anti-slop).
