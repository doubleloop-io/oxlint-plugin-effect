---
title: provide-named-layer
group: Services and Layers
---

**Intent**: `Effect.provide` receives a named Layer, never an inline composition.

```ts
// no
printMissing.pipe(Effect.provide(Layer.mergeAll(FileRaceList.layer, GoogleSheet.readerLayer)))

// yes: the Layer is named in the entry point, provided in the dispatch
const missingLayer = Layer.mergeAll(FileRaceList.layer, GoogleSheet.readerLayer)
Missing: () => printMissing.pipe(Effect.provide(missingLayer)),
```

**Trigger**: an `Effect.provide` argument composed inline: `Layer.*(…)`, a ternary, an `&&`/`||`, a `match`/`$match`.

**Exemptions and blind spots**: test files, where different fakes per test are idiomatic. Where `provide` sits (outside the entry point) needs types: see `strict-effect-provide` (effecttsgo).

**Why**: an inline Layer cannot be reused and hides which adapters a branch chooses. When branches need different Layers, there is one `provide` per branch, all in the dispatch: a single Layer with every service would build adapters the command does not use.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
