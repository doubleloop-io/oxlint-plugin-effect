---
title: no-asymmetric-match-handlers
group: Code shape
---

**Intent**: if one match handler delegates to a named function, the others do too.

```ts
// ❌ no
Option.match(only, {
    onNone: () => missingIn(sheet),
    onSome: Effect.fn("onlyCandidate")(function* (name: string) { … }),
})

// ✅ yes
Option.match(only, {
    onNone: () => missingIn(sheet),
    onSome: (name) => onlyCandidate(sheet, name),
})
```

**Trigger**: on the same matches as [`no-nested-match`](no-nested-match.md), a handler with an inline body next to one that delegates. A handler delegates if it is a reference, a call, or a function returning only a call; it is inline if it has multiple statements, is a generator, or builds an `Effect.fn`/`Effect.gen`.

**Exemptions and blind spots**: returned literals, templates, arrays and objects are values and count on neither side.

**Why**: a branch saying _what_ next to one showing _how_ forces the reader to switch level halfway through the choice.

**Options**: none

**Fix**: none
