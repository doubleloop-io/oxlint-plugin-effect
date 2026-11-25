---
"@doubleloop-io/oxlint-plugin-effect": patch
---

`no-manual-discriminant-construction` names the constructors of Effect's own types for a literal with their `_tag`: `Option.some`/`Option.none`, `Result.succeed`/`Result.fail` (not `Exit`, the outcome of running an effect), `Either.left`/`Either.right`, instead of pointing to a union of one's own.
