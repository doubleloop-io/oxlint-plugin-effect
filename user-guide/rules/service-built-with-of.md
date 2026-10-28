---
title: service-built-with-of
group: Services and Layers
---

**Intent**: the service a Layer provides is built with `Tag.of({…})`, not a bare object literal.

```ts
// ❌ no
export const RepoLive = Layer.effect(
    Repo,
    Effect.gen(function* () {
        const db = yield* Database
        return { find: (id: RepoId) => db.get(id) }
    }),
)

// ✅ yes
export const RepoLive = Layer.effect(
    Repo,
    Effect.gen(function* () {
        const db = yield* Database
        return Repo.of({ find: (id: RepoId) => db.get(id) })
    }),
)
```

**Trigger**: an object literal passed as the value of `Layer.succeed(T, {…})`, returned by the function of `Layer.sync(T, () => ({…}))`, or returned by a top-level `return {…}` of the generator of `Layer.effect(T, Effect.gen(…))` or `Layer.scoped`; the curried `Layer.succeed(T)(…)` forms too.

**Exemptions and blind spots**: a named factory (`Layer.sync(Repo, makeRepo)`) and a variable (`Layer.succeed(Repo, repo)`) are not inspected; `return` inside an `if` or a nested block, `Effect.gen(…).pipe(Layer.effect(T))` and generators other than `Effect.gen` slip through.

**Why**: `T.of` names the service the object implements and keeps it checked against the shape if the literal moves out of the Layer; one form for every Layer.

**Options**: none

**Fix**: suggestion that wraps the literal in `T.of(…)`
