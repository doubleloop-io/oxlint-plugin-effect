---
"@doubleloop-io/oxlint-plugin-effect": patch
---

`no-inline-yield-star` gives its own hint when the `yield*` sits on the right of `??`, `&&`, `||` or a short-circuit assignment (`??=` and the like): keep the `yield*` where it is and move the surrounding expression into a named effect that transforms the result with `Effect.map`, and keep the operator in the expression rather than in an effect combinator such as `Effect.flatMap`.
