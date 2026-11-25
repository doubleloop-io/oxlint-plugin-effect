---
"@doubleloop-io/oxlint-plugin-effect": patch
---

`no-parameterless-catch-all` asks to decide per failure of the error type: catch by tag only the failures the fallback is meant for, and use `Effect.orElse`/`Effect.orElseSucceed` only when the fallback is meant for any failure, future ones included.
