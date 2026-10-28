---
title: service-port-shape-only
group: Services and Layers
---

**Intent**: a port is a shape-only `Context.Service` (v3: `Context.Tag`), with no implementation attached.

```ts
// no
class Agent extends Context.Service<Agent, Shape>()("app/Agent", { make: makeAgent }) {}

// yes
export class Agent extends Context.Service<
    Agent,
    { readonly search: (name: string) => Effect.Effect<RaceCard, AgentError> }
>()("app/agent/Agent") {}
```

**Trigger**: the second argument of `Context.Service<…>()(id, opts)`; a `static layer`, `static Default` or `static Live` member on a `Context.Service` or v3 `Context.Tag(id)<…>()` class; any `Effect.Service`.

**Exemptions and blind spots**: a `Context.Service` or v3 `Context.GenericTag` assigned to a variable is not seen: see `service-not-as-class` (effecttsgo). Statics with other names slip through.

**Why**: `make` and a static layer tie the port to a default implementation, while the port must stay a contract any adapter can satisfy. It is a convention, not Effect's idiom: Effect's own docs put `static readonly layer` on the service.

**Options**: none

**Fix**: none
