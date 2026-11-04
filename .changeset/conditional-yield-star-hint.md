---
"@doubleloop-io/oxlint-plugin-effect": patch
---

`no-inline-yield-star` adds a hint when the `yield*` sits inside a larger conditional branch, where binding it first would run it unconditionally: extract the effect into a named function and transform its result inside it (`Effect.map`), so the branch is a single `yield*`.
