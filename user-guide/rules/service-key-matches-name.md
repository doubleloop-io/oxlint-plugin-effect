---
title: service-key-matches-name
group: Services and Layers
---

**Intent**: a service's key is its class name, alone or after a path prefix.

```ts
// no
export class GeocodingApis extends Context.Service<GeocodingApis, Shape>()("GeocodingAPIs") {}

// yes
export class GeocodingApis extends Context.Service<GeocodingApis, Shape>()("GeocodingApis") {}

// yes
export class GeocodingApis extends Context.Service<GeocodingApis, Shape>()(
    "app/geo/GeocodingApis",
) {}
```

**Trigger**: `class X extends Context.Service<…>()("key")`, or the v3 `Context.Tag("key")<…>()` and `Effect.Service<X>()("key", …)`, with a literal key that is neither `"X"` nor ends with `"/X"`.

**Exemptions and blind spots**: keys that are not literals (variables, templates with expressions). A `Context.Service` assigned to a variable is not seen: see `service-not-as-class` (effecttsgo). `deterministic-keys` (effecttsgo) with the `default` or `package-identifier` formula produces keys this rule accepts; with `default-hashed` the two contradict each other: enable only one.

**Why**: the key is the service's identity in errors, traces and `Context` lookups; a key that drifts from the name, as after a rename, makes it hard to find the class behind a message.

**Options**: none

**Fix**: suggestion that replaces the last segment of the key with the class name
