---
title: untraced-recursion
group: Effectful functions
---

**Intent**: a recursive effectful function uses `Effect.fnUntraced`; the entry point that starts the recursion is traced.

```ts
// ❌ no
const walk = Effect.fn("walk")(function* (node: Node) {
    for (const child of node.children) yield* walk(child)
})

// ✅ yes
const walk = Effect.fnUntraced(function* (node: Node) {
    for (const child of node.children) yield* walk(child)
})
export const scan = Effect.fn("scan")(function* (root: Node) {
    return yield* walk(root)
})
```

**Trigger**: an `Effect.fn` assigned to a variable that its own body calls again, even by passing it as a callback.

**Exemptions and blind spots**: mutual recursion, recursion in pipeables.

**Why**: with `Effect.fn` every level opens a span nested in the previous one.

**Options**: none

**Fix**: none
