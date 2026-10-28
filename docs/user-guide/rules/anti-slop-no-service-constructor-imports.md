---
title: anti-slop-no-service-constructor-imports
group: Services and Layers
---

**Intent**: runtime code obtains a service from its Layer, never by calling its `make…` constructor.

```ts
// ❌ no: in src/runtime.ts
import { makeIssueService } from "./issue-service.ts"

// ✅ yes
import { IssueService } from "./issue-service.ts"

Effect.gen(function* () {
    const issues = yield* IssueService
})
```

**Trigger**: a named import of `make` followed by an uppercase letter (`makeIssueService`, also when renamed) from a relative module.

**Exemptions and blind spots**: test files, which build services from their constructors to inject fakes. Non-relative imports (packages, path aliases), namespace and default imports, and constructors with another prefix slip through. The same import can also fire [`adapter-import-boundary`](adapter-import-boundary.md).

**Why**: calling the constructor wires its dependencies by hand, and its requirements stop propagating to the composition root.

**Options**:

- `testFiles`: shared setting, see [Shared settings](../shared-settings.md).

**Fix**: none

**Origin**: absorbed from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), MIT-licensed: see [`LICENSE.anti-slop`](../../../LICENSE.anti-slop).
