---
title: Common limits
order: 6
---

The limits every rule shares.

- **Syntax only**: no rule uses type information. Only two rules look past the file: [`adapter-import-boundary`](rules/adapter-import-boundary.md), to find which directories are adapters, and [`prefer-effect-vitest`](rules/prefer-effect-vitest.md), to find whether `@effect/vitest` is installed.
- **Literal names**: `Effect.gen` is recognized, `import { Effect as E }` or `import * as L from "effect/Layer"` slip through. On code that uses aliases, silence is not compliance.
- **Effect 4**: the rules are written against v4. Where a v3 API has the same intent, they recognize its v3 name too (`catchAll`, `Either`, `Context.Tag`, `Config.redacted`, …), and the Trigger names it.
