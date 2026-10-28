---
title: exported-schema-identifier
group: Schema
---

**Intent**: an exported schema carries an `identifier` equal to its name.

```ts
// no
export const EventBusEvents = Schema.Union([Created, Deleted])

// yes
export const EventBusEvents = Schema.Union([Created, Deleted]).annotate({
    identifier: "EventBusEvents",
})
```

**Trigger**: `export const X = Schema.Struct(…)`, `Schema.Union(…)` or `Schema.Array(…)`, also followed by `.pipe(…)`, `.annotate(…)` or `.check(…)`, with no `identifier` in a `.annotate(…)` or `Schema.annotate(…)` of the chain (v3: `annotations`), or with a literal `identifier` other than `"X"`.

**Exemptions and blind spots**: non-exported schemas (fragments reused through `.fields`), and `Schema.Class` and `Schema.TaggedError`, which carry the name already. A computed `identifier` is not compared. Other constructors (`Schema.TaggedStruct`, `Schema.Literals`, …), `export { X }` lists and chains through other methods slip through. An exported fragment reused only through `.fields` fires too, although the annotation does not reach the schemas that spread it: export the plain fields object instead (`export const BaseFields = { … }`).

**Why**: without an `identifier`, decoding errors, JSON Schema and arbitraries describe the schema by its structure instead of its name.

**Options**: none

**Fix**: suggestion that corrects the `identifier`, or two that add it, `v3:` with `.annotations(…)` and `v4:` with `.annotate(…)`
