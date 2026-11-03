---
"@doubleloop-io/oxlint-plugin-effect": patch
---

`no-inline-yield-star` autofix names a `const` whose name is taken after the object it is read from (`reader.rows` → `readerRows`, `Effect.scope` → `effectScope`) before falling back to a numeric suffix.
