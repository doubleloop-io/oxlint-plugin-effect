# `better-effect` rules

Reference for the plugin's 20 rules: what they report, which pattern they enforce and why, options, fixes and the severity they ran with in the origin repo. The `Pxx` identifiers come from the origin catalog.

| Rule                                                                          | Pattern  | Origin severity |
| ----------------------------------------------------------------------------- | -------- | --------------- |
| [`service-port-shape-only`](#service-port-shape-only)                         | P01      | `error`         |
| [`adapter-import-boundary`](#adapter-import-boundary)                         | P02      | `error`         |
| [`run-only-at-entry`](#run-only-at-entry)                                     | P04, P22 | `error`         |
| [`no-bare-error-in-effect`](#no-bare-error-in-effect)                         | P05      | `error`         |
| [`try-object-form`](#try-object-form)                                         | P08      | `error`         |
| [`no-effect-promise`](#no-effect-promise)                                     | P08      | `warn`          |
| [`no-parameterless-catch-all`](#no-parameterless-catch-all)                   | P09      | `error`         |
| [`redacted-secret-names`](#redacted-secret-names)                             | P13      | `warn`          |
| [`prefer-effect-fn`](#prefer-effect-fn)                                       | P17      | `warn`          |
| [`untraced-recursion`](#untraced-recursion)                                   | P17      | `warn`          |
| [`single-style-per-function`](#single-style-per-function)                     | P24      | `error`         |
| [`error-handling-in-effect-fn-handler`](#error-handling-in-effect-fn-handler) | P25      | `warn`          |
| [`no-transport-types-in-generator`](#no-transport-types-in-generator)         | P26      | `error`         |
| [`boundary-entrypoint-shape`](#boundary-entrypoint-shape)                     | P27      | `warn`          |
| [`provide-named-layer`](#provide-named-layer)                                 | P28      | `error`         |
| [`no-provide-on-definition`](#no-provide-on-definition)                       | P28      | `error`         |
| [`no-nested-match`](#no-nested-match)                                         | P30      | `warn`          |
| [`no-inline-yield-star`](#no-inline-yield-star)                               | P32      | `warn`          |
| [`no-effect-return-type`](#no-effect-return-type)                             | P33      | `warn`          |
| [`no-asymmetric-match-handlers`](#no-asymmetric-match-handlers)               | P34      | `warn`          |

The `all` preset enables them all at `warn`. The origin severity is the one each rule was kept at zero noise with on an Effect 4 codebase: a data point about its stability, not a recommendation.

## Common limits

- **Syntax only**: no rule uses type information.
- **Literal names**: `Effect.gen` is recognized, `import { Effect as E }` or `import * as L from "effect/Layer"` slip through. On code that uses aliases, silence is not compliance.
- **Effect 4**: the rules also recognize some v3 APIs (`catchAll`, `Effect.Service`, `Context.Tag`), but they are written and tested against v4.

## File options

When the reason for an exclusion is part of the rule, the rule itself recognizes the files, through an option that **replaces** the defaults (it does not extend them). Globs are matched against the path relative to oxlint's working directory, with `/` on every platform.

- **`entryFiles`**, used by [`run-only-at-entry`](#run-only-at-entry) and [`adapter-import-boundary`](#adapter-import-boundary). Default `**/main.ts`, `**/cli.ts`, `**/bin/**`. `index.ts` is excluded on purpose: it is usually a barrel, and exempting it would let adapters reach the rest of the application through re-exports.
- **`testFiles`**, used by [`adapter-import-boundary`](#adapter-import-boundary), [`no-effect-promise`](#no-effect-promise), [`provide-named-layer`](#provide-named-layer), [`no-provide-on-definition`](#no-provide-on-definition) and [`error-handling-in-effect-fn-handler`](#error-handling-in-effect-fn-handler). Default `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**`. A helper directory such as `src/testing/` does not count as tests: it is support code.

The defaults come from a Node CLI. On another layout (Next.js, a monorepo) they must be reconfigured before reading the numbers, and every rule sharing an option must be reconfigured:

```ts
const entryFiles = ["apps/web/src/app/**/route.ts", "apps/web/src/runtime.ts"]

export default defineConfig({
    extends: [betterEffectAll],
    rules: {
        "better-effect/run-only-at-entry": ["warn", { entryFiles }],
        "better-effect/adapter-import-boundary": ["warn", { entryFiles }],
    },
})
```

## Services and Layers

### `service-port-shape-only`

Reports a `Context.Service` port that carries an implementation: the second argument of `Context.Service<…>()(id, opts)`, a `static layer` or `static Default` member on the class, and the `Effect.Service`, `Context.Tag`, `Context.GenericTag` forms.

- **Pattern**: P01 · Port as a shape-only `Context.Service`.
- **Options**: none. **Fix**: none.
- **Origin severity**: `error`.

**Rule**: a port is `class X extends Context.Service<X, Shape>()("pkg/path/X") {}`, without a `make` option, without `static layer`; no `Effect.Service`.

**Why**: `make` and the static layer tie the port to a default implementation; the port must stay a contract. It is a convention, not an idiom: `node_modules/effect/AGENTS.md` shows exactly `static readonly layer` on the service.

```ts
// no (v3: Effect.Service<Agent>()("Agent", { effect: ... }))
class Agent extends Context.Service<Agent, Shape>()("app/Agent", { make: makeAgent }) {}

// yes
export class Agent extends Context.Service<
    Agent,
    { readonly search: (name: string) => Effect.Effect<RaceCard, AgentError> }
>()("app/agent/Agent") {}
```

In v4 tsc already rejects `Effect.Service`, `Context.Tag` and `Context.GenericTag`: that part of the rule serves v3 code. With the `effecttsgo` presets enabled there is no duplication: `service-not-as-class` reports only a `Context.Service` assigned to a variable, a form this rule does not see, and is silent on the five this one covers; `outdated-api` overlaps only on `Effect.Service`.

### `adapter-import-boundary`

Reports a relative import of an adapter directory from outside that directory: from domain code, or from another adapter. A directory is an adapter when one of its `.ts` files (tests excluded) builds a `Layer` with `Layer.effect`, `succeed`, `sync`, `scoped`, `effectContext`, `unwrap`, `mock` and similar; composition alone (`mergeAll`, `provide`, `merge`) does not count. Entry files are exempt, because that is where adapters are chosen, and so are test files, because a test composes the Layers it exercises.

- **Pattern**: P02 · Adapters in separate Layers, ports without adapter details.
- **Options**: `entryFiles`, `testFiles` (see [File options](#file-options)). **Fix**: none.
- **Origin severity**: `error`.

**Rule**: every implementation is a `Layer` in its own directory (`google/`, `csv/`, `print/`). The port exposes neither library types nor infrastructure requirements in the `R` channel: dependencies are resolved when the layer is built.

**Why**: the adapter can be replaced without touching consumers, and service methods keep `R = never`.

```ts
// no: the port drags HttpClient into consumers
readonly get: (url: string) => Effect.Effect<Todo, ApiError, HttpClient.HttpClient>

// yes: the dependency enters when the layer is built
export const layer = Layer.effect(Agent, Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  return Agent.of({ search: (name) => run(spawner, name) })
}))
```

It is the only rule that reads the filesystem: for each imported directory it opens the files and looks for a `Layer` being built. On a layout different from the one it was born for (one directory per adapter) its behavior should be observed before trusting the numbers. Infrastructure requirements in the port's `R` channel stay out of reach, since they require types (the language service's `leakingRequirements` diagnostic).

### `run-only-at-entry`

Reports every reference, not just calls, to `Effect.run*`, `NodeRuntime.runMain`, `BunRuntime.runMain` and `ManagedRuntime.make` outside entry files. Test files get no exemption.

- **Pattern**: P04 · Execution only at the entry point; P22 · Tests run Effect in one place, fakes as Layers.
- **Options**: `entryFiles` (see [File options](#file-options)). **Fix**: none.
- **Origin severity**: `error`.

**Rule (P04)**: a single `NodeRuntime.runMain` (or `ManagedRuntime.make` when integrating a framework) in the entry point, where the Layers are also composed. No `Effect.runPromise`/`runSync` elsewhere.

**Why**: logger, layers and defect handling are configured in a single place (`AGENTS.md`, sections "Running Effect programs" and "Integrating Effect").

```ts
// no
export const check = () => Effect.runPromise(pingDb(url))

// yes
NodeRuntime.runMain(run(process.argv.slice(2)).pipe(Effect.provide(NodeServices.layer)))
```

**Rule (P22)**: effect tests use `it.effect`, or `effect` imported as `test`, and `layer(...)` for shared layers. Fakes are `Layer.succeed(Tag, Tag.of({…}))`. No `Effect.runPromise` in tests, no module mocks.

**Why**: the test runs in Effect's test runtime (with `TestClock`) and replaces services where the code reads them. References: `ai-docs/src/09_testing/10_effect-tests.ts` and `ai-docs/src/09_testing/20_layer-tests.ts`.

**Without `@effect/vitest`** (e.g. a vitest version it does not support yet): a single test runner module is the tests' entry point, listed in `entryFiles`, and each test returns one call to it from a non-async callback, assertions inside the generator. The Layer stays in one place and the test keeps one style ([`single-style-per-function`](#single-style-per-function)); what is lost is the test runtime, `TestClock` included.

```ts
// src/testing/run.ts, in entryFiles
export const run = <A, E>(effect: Effect.Effect<A, E, TestServices>) =>
    Effect.runPromise(effect.pipe(Effect.provide(testLayer)))

// test
test("rejects a subject bound to another account", () =>
    run(
        Effect.gen(function* () {
            const outcome = yield* Effect.result(bind(subject, other))
            expect(outcome._tag).toBe("Failure")
        }),
    ))
```

```ts
// no
test("…", async () => {
    await Effect.runPromise(authorize({ role: "Manager" }))
})

// yes
const sheetWith = (...rows: ReadonlyArray<Row>) =>
    Layer.succeed(SheetReader, SheetReader.of({ rows: Effect.succeed([header, ...rows]) }))
```

A module-level `ManagedRuntime` in a test is the typical case the rule catches: it skips the test runtime and is often never released.

## Errors

### `no-bare-error-in-effect`

Reports a `throw` directly inside a generator passed to `Effect.gen`/`Effect.fn`, and `Effect.fail` with a literal or a template as argument.

- **Pattern**: P05 · Tagged expected errors, never a bare `Error`.
- **Options**: none. **Fix**: none.
- **Origin severity**: `error`.

**Rule**: every expected failure is a `Schema.TaggedError` or `Data.TaggedError` class. Never `Effect.fail(new Error(…))` or `Effect.fail("string")`, never `class X extends Error` with a manual `_tag`, never `throw` inside an Effect generator.

**Why**: the typed error channel only works with discriminating tags. A `throw` in the generator becomes a defect.

```ts
// no
class TabNotFound extends Error {
    readonly _tag = "TabNotFound"
}
Effect.fail(new Error("tab not found"))

// yes
export class SheetTabNotFoundError extends Schema.TaggedError<SheetTabNotFoundError>()(
    "SheetTabNotFoundError",
    { spreadsheetId: Schema.String, message: Schema.String },
) {}
```

The rule covers only the two forms the `effecttsgo` presets do not see: the `throw` in the generator and failing with a primitive value. `Effect.fail(new Error(…))` and `extends Error` are reported by `global-error-in-effect-failure` and `extends-native-error`; without those presets they stay uncovered.

### `try-object-form`

Reports `Effect.try` and `Effect.tryPromise` whose argument is not an object.

- **Pattern**: P08 · `tryPromise`/`try` in object form.
- **Options**: none. **Fix**: none.
- **Origin severity**: `error`.

**Rule**: `Effect.tryPromise({ try, catch })` and `Effect.try({ try, catch })`, with `catch` producing a tagged adapter error. `Effect.promise` only for promises that cannot reject, for example releasing a resource.

**Why**: the thunk form types the error as `Cause.UnknownError` (JSDoc of `Effect.tryPromise` in v4; `UnknownException` in v3). `Effect.promise` turns a rejection into a defect.

```ts
// no
Effect.tryPromise(() => api.spreadsheets.get({ spreadsheetId }))
Effect.promise(() => client.connect())

// yes
Effect.tryPromise({
    try: () => api.spreadsheets.get({ spreadsheetId }),
    catch: toSheetError(spreadsheetId),
})
```

### `no-effect-promise`

Reports `Effect.promise` outside the release step of `acquireRelease`, `acquireUseRelease` and `addFinalizer`, where a promise that cannot reject is the normal case. Test files are exempt, because a rejection during setup is a broken test and the defect fails it with the cause.

- **Pattern**: P08 · `tryPromise`/`try` in object form. Rule, rationale and examples in [`try-object-form`](#try-object-form).
- **Options**: `testFiles` (see [File options](#file-options)). **Fix**: none.
- **Origin severity**: `warn`: a promise that truly cannot reject, outside a release, is legitimate and must be suppressed by hand.

### `no-parameterless-catch-all`

Reports `Effect.catch`, `catchAll`, `catchCause` and `catchEager` with a parameterless handler, i.e. one that ignores what it catches.

- **Pattern**: P09 · Targeted catches, no catch-all that discriminates or swallows.
- **Options**: none. **Fix**: none.
- **Origin severity**: `error`.

**Rule**:

- recovering from or translating specific errors uses `catchTag`, `catchTag([...])`, `catchTags` or `mapError`;
- `Effect.catch` (v3 `catchAll`) is only for the boundary or for converting everything into an output value;
- never compare `_tag` inside a catch-all;
- never `catch(() => fallback)` when `orElseSucceed` expresses the intent.

**Why**: a catch-all that discriminates by hand does not notice new errors; one that ignores its parameter also swallows those added later.

```ts
// no
Effect.catch((e) => (e._tag === "AgentTimeout" ? Effect.succeed(skip) : Effect.fail(e)))
Effect.catch(() => Effect.succeed(fallback))

// yes
Effect.catchTag("AgentTimeout", () => Effect.succeed(skip))
Effect.catchTag(["ParseError", "ReservedPortError"], () => Effect.succeed(3000))
Effect.orElseSucceed(() => fallback)
```

The rule covers only the swallowing catch-all. Manual discrimination on `_tag` inside a catch-all is out of scope; the transformations towards `catchTag`/`mapError` are proposed by the `effecttsgo` presets (`catch-all-to-map-error`, `catch-all-tag-dispatch-to-catch-tag`, `catch-to-ignore`).

## Config

### `redacted-secret-names`

Reports a literal name read with `Config.*` that ends with `KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `CREDENTIAL`, `CREDENTIALS` or `_JSON`, when it does not go through `Config.redacted` or `Config.schema(Schema.Redacted…(…), name)`. It is a naming heuristic: `_JSON` is there because a service account key often travels as inline JSON.

- **Pattern**: P13 · Config via `Config`, secrets via `Config.redacted`.
- **Options**: none. **Fix**: none.
- **Origin severity**: `warn`, because it is a heuristic.

**Rule**: environment variables are read only with the `Config` module, in a single file; secrets go in `Config.redacted` (or `Config.schema(Schema.Redacted(…), name)`), and `Redacted.value` is called only where the secret is passed to the library.

**Why**: config errors are typed and the secret does not end up in logs and `toString`. The v4 JSDoc says `Config.redacted` is a shortcut for `Config.schema(Schema.Redacted(Schema.String), name)`.

```ts
// no
serviceAccount: Config.schema(NonBlank, "GOOGLE_SERVICE_ACCOUNT_JSON")

// yes
serviceAccount: Config.schema(Schema.Redacted(NonBlank), "GOOGLE_SERVICE_ACCOUNT_JSON")
```

`process.env` read outside `Config` is not covered here: `process-env` and `process-env-in-effect` from the `effecttsgo` presets report it.

## Effectful functions

### `prefer-effect-fn`

Reports:

- a declared function, a variable or an object member that only returns `Effect.gen(…)`, even with `.pipe`;
- a variable or an object member whose value is `Effect.gen(…)` without `Effect.withSpan` in its `.pipe`;
- `Effect.fn(body)` without a name;
- `.pipe` on `Effect.fn(…)(…)`.

- **Pattern**: P17 · `Effect.fn("name")` for effectful functions.
- **Options**: none. **Fix**: none.
- **Origin severity**: `warn`.

**Rule**: a function returning an Effect is written `Effect.fn("name")(function* (…) {…}, …combinators)`, not `(…) => Effect.gen(…)`. Extra combinators are passed as arguments, not with `.pipe`. Without parameters, a named value (variable or object member, port fields included) needs a span: either `Effect.fn("x")(function* () {…})` called as `x()`, or `Effect.gen(…).pipe(Effect.withSpan("x"))` kept as a value; a bare `const x = Effect.gen(…)` is reported. `Effect.gen` without a span stays only inline, as an argument (`Layer.effect(Tag, Effect.gen(…))`, `Stream.unwrap`, callbacks, `it.effect`). For recursive functions see [`untraced-recursion`](#untraced-recursion).

**Why**: named stack traces and spans, without wrappers. `AGENTS.md`: "Avoid creating functions that return an Effect.gen" and "Do not use .pipe with Effect.fn". For values, `Effect.fn` and `withSpan` give the same observability: a span at every run and a frame where the value is defined. The call-site frame `Effect.fn` adds always points at the same line, because the value is called once where it is declared or collected. `withSpan` keeps the value's shape, so a contract that wants an `Effect` (a port field, a migration record) takes it as is.

```ts
// no
const outcomeFor = (name: string) => Effect.gen(function* () { … }).pipe(Effect.catch(toFailed))

// yes
const outcomeFor = Effect.fn("outcomeFor")(function* (name: string) { … }, Effect.catch(toFailed))
```

Combinators passed as arguments also receive the function's arguments: `(effect, name) => effect.pipe(Effect.catch…)`. Where a combinator is the only thing distinguishing two functions, for example the provided Layer, it is applied in the dispatch to a shared `Effect.fn`, not to an `Effect.gen`.

With the `effecttsgo` presets enabled it stays useful: on the origin codebase `effect-fn-opportunity` saw none of the spots this rule reported.

### `untraced-recursion`

Reports an `Effect.fn` assigned to a variable that its own body calls again, even by passing it as a callback. It does not see mutual recursion or recursion in pipeables.

- **Pattern**: P17 · `Effect.fn("name")` for effectful functions. General rule, rationale and examples in [`prefer-effect-fn`](#prefer-effect-fn).
- **Options**: none. **Fix**: none.
- **Origin severity**: `warn`.

**Rule**: a recursive function uses `Effect.fnUntraced`; trace the entry point that starts the recursion.

**Why**: with `Effect.fn` every level would open a span nested in the previous one. It is the only `fnUntraced` case recognizable from syntax; hot paths and trivial wrappers stay the author's choice.

### `single-style-per-function`

Reports `async`, `await` and `.then(` in a function that builds Effects: an Effect generator, or a function using an `Effect.*` member. `Effect.run*` does not make a function effectful, because it is the legitimate way an async boundary hands over to Effect; where it may appear is decided by [`run-only-at-entry`](#run-only-at-entry).

In a `test`/`it` callback (including `.only`, `.each(…)` and the like) the mix is reported once on the callback, pointing to a test whose body is one Effect: `it.effect`, or one call to the test runner ([P22](#run-only-at-entry)). Lifting each promise with `Effect.tryPromise` would be the wrong fix there.

- **Pattern**: P24 · One style per function.
- **Options**: none. **Fix**: none.
- **Origin severity**: `error`.

**Rule**: a function is either entirely Effect or not Effect at all. Inside a function containing `yield*` or Effect constructors there is no `async`, `await`, `.then` or `Effect.run*`. Promises are lifted with `Effect.tryPromise` ([`try-object-form`](#try-object-form)).

**Why**: the mix is the worst of both, because errors travel on two different channels, exceptions and Effect, and neither sees them all.

```ts
// no
export const POST = async (request: Request) => {
    const credential = await readSession()
    const submission = submittedEvent(await request.formData())
    if (submission._tag === "Left") return new Response(submission.left, { status: 400 })
    const created = await Effect.runPromise(
        Effect.either(apiCreateEvent(credential, submission.right)),
    )
    // …
}

// yes
const createEvent = Effect.fn("events.create")(function* (request: Request) {
    const credential = yield* sessionCredential
    const form = yield* Effect.tryPromise({
        try: () => request.formData(),
        catch: () => new BadRequest({ message: "invalid form data" }),
    })
    // …
})
```

### `error-handling-in-effect-fn-handler`

Reports, inside a generator passed to `Effect.gen`/`Effect.fn` and also in nested callbacks, calls to `Effect.catch*` (`catch`, `catchAll`, `catchTag`, `catchTags`, `catchIf`, `catchCause`, `catchDefect`, `catchReason`, …), `either`, `result`, `exit`, `match*` and `sandbox`. Pipeables of a nested `Effect.fn` are exempt. Test files are skipped.

- **Pattern**: P25 · Success in the generator, errors in the second argument of `Effect.fn`.
- **Options**: `testFiles` (see [File options](#file-options)). **Fix**: none.
- **Origin severity**: `warn`.

**Rule**: the generator passed to `Effect.fn` contains only the happy path, read top to bottom. Error handling lives in the second, pipeable argument. `Effect.mapError`, `Effect.orElse` and `Effect.orElseSucceed` stay allowed: they name the error or give an alternative without opening a handling branch. It applies to all effectful functions, not only boundaries.

**Why**: it separates success logic from error translation, and makes translation a single exhaustive point instead of catches scattered along the flow. A failure is named where it originates (`mapError`) and handled where the response is decided.

```ts
// no
function* () {
  const x = yield* fetchThing.pipe(Effect.catchTag("NotFound", () => Effect.succeed(fallback)))
}

// yes: inline alternative, no handling branch
function* () {
  const x = yield* fetchThing.pipe(Effect.orElseSucceed(() => fallback))
  const y = yield* decode(raw).pipe(Effect.mapError((error) => new BadRequest({ message: error.message })))
}

// yes: translation lives entirely in the second argument, which also receives the original arguments
const createEvent = Effect.fn("events.create")(
  function* (request: Request) { /* success only */ },
  (effect, request) => effect.pipe(Effect.catchTags({ BadRequest: (e) => refused(400, e.message) })),
)
```

In a test the failure is the outcome under observation: `const outcome = yield* Effect.result(op)` followed by `expect(outcome…)` handles nothing, and a test callback has no second argument to move it to.

It goes together with [`prefer-effect-fn`](#prefer-effect-fn): without it, the rule is bypassed by appending `.pipe(Effect.catch…)` to an `Effect.gen`.

### `no-transport-types-in-generator`

Reports `new T(…)`, `T.method(…)` and `T(…)` inside an Effect generator, nested callbacks included, when `T` is a transport type. Pipeables of `Effect.fn` are exempt: that is where the conversion must live.

- **Pattern**: P26 · No transport types in the generator.
- **Options**: `transportTypes`, a list of names replacing the default `["Response", "NextResponse"]`. It varies from project to project: add your own transport DTOs. **Fix**: none.
- **Origin severity**: `error`.

**Rule**: the generator returns a domain value. Conversion to `Response` (or `NextResponse`, or a transport DTO) happens in the second argument of `Effect.fn`, with `Effect.map` for success and `Effect.catchTags` for errors.

**Why**: an early `return new Response(...)` on the happy path is almost always an error branch disguised as success, and escapes exhaustive translation. With all conversion in the second argument, success and error become symmetric and the generator stays readable as a linear sequence.

```ts
// no: an error branch inside the happy path
function* (request: Request) {
  const credential = yield* sessionCredential
  if (credential === undefined) return Response.redirect(new URL("/login", origin), 303)
  // …
}

// yes
const createEvent = Effect.fn("events.create")(
  function* (request: Request) {
    const credential = yield* sessionCredential   // fails with Unauthenticated
    const fields = yield* form(request)
    const submission = yield* submittedEvent(fields)
    return yield* apiCreateEvent(credential, submission)
  },
  (effect, request) =>
    effect.pipe(
      Effect.map((created) => Response.redirect(new URL(`/events/${created.id}`, requestOrigin(request)), 303)),
      Effect.catchTags({ Unauthenticated: () => endSession.pipe(Effect.as(toLogin(request))) }),
    ),
)
```

`return yield* new Unauthenticated(...)` stays allowed: it is a declared failure. Not covered is the semantic case of an early `return` of a domain value that actually signals an error: it is indistinguishable from a legitimate success.

### `boundary-entrypoint-shape`

Reports `Effect.runPromise`, `runSync`, `runFork`, `runCallback` and `NodeRuntime.runMain`/`BunRuntime.runMain` whose argument is neither `… satisfies Effect.Effect<A, never>` nor a parameter declared with that type. The `*Exit` variants are exempt: they return failures as values.

- **Pattern**: P27 · Entry point with the error channel closed to `never`.
- **Options**: none. **Fix**: none.
- **Origin severity**: `warn`.

**Rule**: the entry point only runs the handler, with the error channel fixed to `never` before running it, via `satisfies Effect.Effect<A, never>` or a typed helper.

**Why**: `Effect.runPromise` accepts any error channel and turns what is left into a rejected promise, i.e. a generic 500. Fixing `never` moves the check to `tsc`: a new, untranslated error does not compile. `Effect.Effect<A, never>` also fixes `R = never`, so it forces providing all required Layers.

```ts
// no
export const POST = (request: Request) => Effect.runPromise(createEvent(request))

// yes
export const POST = (request: Request) =>
    Effect.runPromise(createEvent(request) satisfies Effect.Effect<Response, never>)

// equivalent, easier to check with lint
const runBoundary = (effect: Effect.Effect<Response, never, never>) => Effect.runPromise(effect)
```

The rule checks the shape; `tsc` gives the guarantee. The typical anti-example: a `catchTags` that leaves out decoding, config or `UnknownError` errors, and those failures escape as the framework's 500s.

## Wiring and code shape

### `provide-named-layer`

Reports an `Effect.provide` argument composed inline: `Layer.*(…)`, a ternary, an `&&`/`||`, a `match`/`$match`. Skips test files.

- **Pattern**: P28 · Separate wiring: named layers, `provide` only in the dispatch.
- **Options**: `testFiles` (see [File options](#file-options)). **Fix**: none.
- **Origin severity**: `error`.

**Rule**: programs (`Effect.gen`, `Effect.fn`) do not `provide`. An application's Layers are named values (`fillLayer`, `planLayer(sheetCsv)`), declared once in the entry point. `Effect.provide` appears only in the entry point, where the dispatch associates each program with its Layer, and always receives a name, never an inline composition.

**Why**: a program that provides its own Layers can no longer be wired to different adapters by its caller. An inline Layer cannot be reused and hides which adapters a branch chooses. A single `provide` at the top remains the ideal, but is not always possible: Layers are built when you provide them, so a single Layer with all services would build adapters the command does not use. When branches require different Layers you need one `provide` per branch, all in the same place.

```ts
// no
const printMissing = Effect.gen(function* () { ... }).pipe(
    Effect.provide(Layer.mergeAll(FileRaceList.layer, GoogleSheet.readerLayer)),
)

// yes
const missingLayer = Layer.mergeAll(FileRaceList.layer, GoogleSheet.readerLayer)
const printMissing = Effect.gen(function* () { ... })
// in the dispatch
Missing: () => printMissing.pipe(Effect.provide(missingLayer)),
```

In tests `it.effect(…, () => Effect.gen(…).pipe(Effect.provide(fakes)))` is the idiomatic form, with different fakes per test: that is why both P28 rules skip tests on their own.

With the `effecttsgo` presets enabled, `strict-effect-provide` covers the **position** (a Layer `provide` outside the entry point), using types; the P28 rules cover the **shape**. The overlap with [`no-provide-on-definition`](#no-provide-on-definition) is partial: on the three forms of `provide` applied to a definition both fire, but `strict-effect-provide` also reports `provide` on a named program, which the local rule allows, and ignores providing a `Context`, which the local rule reports. `strict-effect-provide` has no options: the entry point and tests must be exempted with `overrides`.

### `no-provide-on-definition`

Reports `Effect.provide` applied to `Effect.gen(…)` or to `Effect.fn(…)(…)`, in all three forms: with `.pipe`, as an `Effect.fn` pipeable, data-first. Skips test files.

- **Pattern**: P28 · Separate wiring. Rule, rationale and examples in [`provide-named-layer`](#provide-named-layer).
- **Options**: `testFiles` (see [File options](#file-options)). **Fix**: none.
- **Origin severity**: `error`.

### `no-nested-match`

Reports a handler of `Option.match`, `Result.match`, `Exit.match`, `Either.match`, `$match` or `Match.valueTags` that is itself a data-last match, or that returns a match or a ternary. It does not see `if` inside handlers, `Match.value`/`Match.type` chains, or matches nested deeper than the returned value.

- **Pattern**: P30 · Guard clauses instead of nested matches.
- **Options**: none. **Fix**: none.
- **Origin severity**: `warn`, until proven on a larger codebase.

**Rule**: when a match has an exit case (parse failure, absence) and one that continues, the exit case is a guard clause with an early `return` (`Result.isFailure`, `Option.isNone`), and the rest of the function is the happy path at the top level. A match handler contains neither another match nor a ternary.

**Why**: two nested levels of choice hide which branch is the normal one. `Result.match` stays suitable when both branches are short expressions producing a value.

```ts
// no
const run = (argv: ReadonlyArray<string>) =>
    Result.match(parseArgs(argv), {
        onFailure: usageError,
        onSuccess: CliCommand.$match({ ... }),
    })

// yes
const run = (argv: ReadonlyArray<string>) => {
    const parsed = parseArgs(argv)
    if (Result.isFailure(parsed)) return usageError(parsed.failure)

    return CliCommand.$match(parsed.success, { ... })
}
```

### `no-inline-yield-star`

Reports a `yield*` whose result is used inside a larger expression: argument, operand, member, property, template.

- **Pattern**: P32 · A `yield*` does not sit inside a larger expression.
- **Options**: none.
- **Fix**: autofix (`oxlint --fix`) when moving the effect before the statement changes neither when nor how many times it runs. It extracts all nested `yield*`s of the statement into `const`s, innermost first and left to right, and derives the name from the argument's last identifier without a verb prefix (`readSheet()` → `sheet`, `reader.rows` → `rows`), with a numeric suffix if the name is already taken and `value` as fallback. No fix, only the warning, in the branches of a ternary or `&&`/`||`/`??` nested in a larger expression, with optional chaining, in `while`/`for` conditions, in statements without braces, or when another call is evaluated before the `yield*`.
- **Origin severity**: `warn`.

**Rule**: a `yield*` result is bound to a `const` before being used. A `yield*` is allowed only as the whole value of a statement (`yield* x`, `return yield* x`, `if (yield* x)`, `for (… of yield* x)`), of a declaration (`const a = yield* x`) or of an assignment (`a = yield* x`). The same holds for the whole branch of a ternary or the right operand of `&&`/`||`/`??` whose expression is itself in one of those positions (`return ready ? yield* x : []`, `const a = cached ?? (yield* x)`): the branch runs at most once, after the condition, so the order is already the reading order, and binding the result first would run the effect unconditionally.

**Why**: a `yield*` nested in an argument, an operand or a template runs an effect in the middle of an expression; with several `yield*`s in the same expression the order of effects can only be inferred from precedence. One `const` per effect makes the order the reading order and names the intermediate value.

```ts
// no
const missing = Effect.fn("missing")(function* () {
    return yield* missingIn(yield* readSheet())
})

// yes
const missing = Effect.fn("missing")(function* () {
    const sheet = yield* readSheet()
    return yield* missingIn(sheet)
})
```

### `no-effect-return-type`

Reports `Effect.Effect`, `Stream.Stream` or `Layer.Layer` in an annotated return type, even nested (`Option.Option<Effect.Effect<…>>`, a function returning an `Effect`). Exempt are recursion and returns of different shapes that need unifying, recognized without types from the shape of the `return`s: different callee or class, different node types. An `import type { Effect }` used as `Effect<…>` slips through.

- **Pattern**: P33 · No `Effect`, `Stream` or `Layer` in the annotated return type.
- **Options**: none. **Fix**: suggestion that removes the annotation, not an autofix.
- **Origin severity**: `warn`.

**Rule**: a return type may be annotated, and a named type (`Insertion`, `Result.Result<A, E>`, `Option.Option<A>`) stays as a contract. `Effect.Effect`, `Stream.Stream` and `Layer.Layer` are not annotated. Exceptions: multiple return branches to unify into a single type (`Effect.succeed` and `Effect.fail`) and recursion, where TypeScript requires the annotation.

**Why**: the error and requirement channels collect what comes from everything the function calls. An error or a service added deep down changes every caller's annotation, while inference keeps them aligned on its own. A named type rarely changes and states the intent.

```ts
// no
(effect, name): Effect.Effect<RaceFillResult, never, Agent | SheetReader | SheetWriter> =>

// yes
(effect, name) =>

// yes: a named type stays
export const insertionAt = (section: Section, start: DayOfYear): Insertion => {
```

### `no-asymmetric-match-handlers`

Reports, on the same matches as [`no-nested-match`](#no-nested-match), a handler with an inline body next to one that delegates to a function. A handler delegates if it is a reference, a call, or a function returning only a call; it is inline if it has multiple statements, is a generator, or builds an `Effect.fn`/`Effect.gen`. Returned literals, templates, arrays and objects are values and count on neither side.

- **Pattern**: P34 · Match handlers at the same level of abstraction.
- **Options**: none. **Fix**: none, because extraction must choose name and captured parameters; if the handler is an `Effect.fn("name")` the message suggests that name.
- **Origin severity**: `warn`.

**Rule**: if one match handler delegates to a named function, the others do too. A handler with its own body next to one that calls a function is extracted into a named function.

**Why**: a branch saying _what_ next to one showing _how_ forces the reader to switch level halfway through the choice, and hides that the branches are equivalent alternatives.

```ts
// no
Option.match(only, {
    onNone: () => missingIn(sheet),
    onSome: Effect.fn("onlyCandidate")(function* (name: string) { ... }),
})

// yes
Option.match(only, {
    onNone: () => missingIn(sheet),
    onSome: (name) => onlyCandidate(sheet, name),
})
```
