---
title: adapter-import-boundary
group: Design and boundaries
---

**Intent**: domain code and other adapters do not import an adapter; only entry files choose it.

```ts
// no: in src/orders/place-order.ts
import { GoogleCalendar } from "../calendar/google/GoogleCalendar.ts"

// yes: depend on the port, main.ts provides GoogleCalendar.layer
import { Calendar } from "../calendar/Calendar.ts"
```

**Trigger**: a relative import of a file in another directory that is an adapter: one of its `.ts` files (tests excluded) builds a `Layer` with `Layer.effect`, `succeed`, `sync`, `scoped`, `effectContext`, `unwrap`, `mock` and similar, or declares a v3 `Effect.Service`, which always carries its implementation. Composition alone (`mergeAll`, `provide`, `merge`) does not make an adapter.

**Exemptions and blind spots**: entry files, where adapters are chosen, and test files, which compose the Layers they exercise. Non-relative imports (path aliases such as `@/calendar/google`) and directory imports through an `index.ts` (`"../google"`) slip through. On a layout other than one directory per adapter, check what it reports before trusting it. Infrastructure requirements in the port's `R` channel need types: see `leaking-requirements` (effecttsgo).

**Why**: the adapter can be replaced without touching its consumers.

**Options**:

- `entryFiles`: shared setting, see [Shared settings](../shared-settings.md).
- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none
