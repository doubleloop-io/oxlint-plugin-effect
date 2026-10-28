---
title: no-effect-return-type
group: Code shape
---

**Intent**: `Effect`, `Stream` and `Layer` return types are inferred, not annotated, except on exported declarations.

```ts
// no
(effect, name): Effect.Effect<RaceFillResult, never, Agent | SheetReader | SheetWriter> =>

// yes
(effect, name) =>

// yes: an exported declaration keeps its annotation as a contract
export const findPrice = (id: PriceId): Effect.Effect<Price, PriceNotFound> =>
```

**Trigger**: `Effect.Effect`, `Stream.Stream` or `Layer.Layer` in an annotated return type, even nested (`Option.Option<Effect.Effect<…>>`, a function returning an `Effect`).

**Exemptions and blind spots**: module-level declarations with `export` (`export const`, `export function`, `export default`), unless `checkExported` is on; methods of an exported object, functions an exported function returns, and `export { f }` lists are still checked. Recursion, and returns of different shapes that need unifying (`Effect.succeed` and `Effect.fail`), recognized from the shape of the `return`s. An `import type { Effect }` used as `Effect<…>` slips through.

**Why**: the error and requirement channels collect what comes from everything the function calls; an error or a service added deep down would change every caller's annotation. An exported signature is the module's contract, like a named type: there the annotation makes such a change visible where it is published. To check a returned object against a named type, annotate the callback that builds it (`Effect.map(CurrentSession, (session): OrganizationContext => ({ … }))`) or use `satisfies`.

**Options**:

- `checkExported`: default `false`. Also checks exported declarations.

**Fix**: suggestion that removes the annotation
