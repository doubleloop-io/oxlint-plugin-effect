# `@doubleloop-io/oxlint-plugin-effect` rules

The plugin's 31 rules. The `Pxx` identifiers come from the origin catalog.

## Rules index

| Rule                                                                                    | Pattern | Severity |
| --------------------------------------------------------------------------------------- | ------- | -------- |
| [`service-port-shape-only`](#service-port-shape-only)                                   | P01     | `error`  |
| [`adapter-import-boundary`](#adapter-import-boundary)                                   | P02     | `error`  |
| [`run-only-in-runner`](#run-only-in-runner)                                             | P04     | `error`  |
| [`no-bare-error-in-effect`](#no-bare-error-in-effect)                                   | P05     | `error`  |
| [`try-object-form`](#try-object-form)                                                   | P08     | `error`  |
| [`no-effect-promise`](#no-effect-promise)                                               | P08     | `warn`   |
| [`no-parameterless-catch-all`](#no-parameterless-catch-all)                             | P09     | `error`  |
| [`redacted-secret-names`](#redacted-secret-names)                                       | P13     | `warn`   |
| [`prefer-effect-fn`](#prefer-effect-fn)                                                 | P17     | `warn`   |
| [`untraced-recursion`](#untraced-recursion)                                             | P17     | `warn`   |
| [`prefer-effect-vitest`](#prefer-effect-vitest)                                         | P22     | —        |
| [`single-style-per-function`](#single-style-per-function)                               | P24     | `error`  |
| [`error-handling-in-effect-fn-handler`](#error-handling-in-effect-fn-handler)           | P25     | `warn`   |
| [`no-transport-types-in-generator`](#no-transport-types-in-generator)                   | P26     | `error`  |
| [`all-errors-handled-at-boundary`](#all-errors-handled-at-boundary)                     | P27     | `warn`   |
| [`provide-named-layer`](#provide-named-layer)                                           | P28     | `error`  |
| [`no-provide-on-definition`](#no-provide-on-definition)                                 | P28     | `error`  |
| [`no-nested-match`](#no-nested-match)                                                   | P30     | `warn`   |
| [`no-inline-yield-star`](#no-inline-yield-star)                                         | P32     | `warn`   |
| [`no-effect-return-type`](#no-effect-return-type)                                       | P33     | `warn`   |
| [`no-asymmetric-match-handlers`](#no-asymmetric-match-handlers)                         | P34     | `warn`   |
| [`exported-schema-identifier`](#exported-schema-identifier)                             | P35     | —        |
| [`no-manual-discriminant-comparison`](#no-manual-discriminant-comparison)               | P36     | —        |
| [`no-manual-discriminant-construction`](#no-manual-discriminant-construction)           | P37     | —        |
| [`service-key-matches-name`](#service-key-matches-name)                                 | P38     | —        |
| [`no-inline-schema-codec`](#no-inline-schema-codec)                                     | P39     | —        |
| [`no-yielded-match`](#no-yielded-match)                                                 | P40     | —        |
| [`service-built-with-of`](#service-built-with-of)                                       | P41     | —        |
| [`anti-slop-no-service-constructor-imports`](#anti-slop-no-service-constructor-imports) | —       | —        |
| [`anti-slop-no-manual-effect-error-tag`](#anti-slop-no-manual-effect-error-tag)         | —       | —        |
| [`anti-slop-prefer-effect-match`](#anti-slop-prefer-effect-match)                       | —       | —        |

The `all` preset enables them all at `warn`. Severity is the one each rule was kept at zero noise with on an Effect 4 codebase: a data point about its stability, not a recommendation. `—` means not yet measured.

## Common limits

- **Syntax only**: no rule uses type information, and only [`prefer-effect-vitest`](#prefer-effect-vitest) looks past the file, to find whether `@effect/vitest` is installed.
- **Literal names**: `Effect.gen` is recognized, `import { Effect as E }` or `import * as L from "effect/Layer"` slip through. On code that uses aliases, silence is not compliance.
- **Effect 4**: the rules also recognize some v3 APIs (`catchAll`, `Effect.Service`, `Context.Tag`), but they are written and tested against v4.

## File options

When the reason for an exclusion is part of the rule, the rule itself recognizes the files, through an option that **replaces** the defaults (it does not extend them). Globs are matched against the path relative to oxlint's working directory, with `/` on every platform.

- **`entryFiles`**, used by [`run-only-in-runner`](#run-only-in-runner) and [`adapter-import-boundary`](#adapter-import-boundary). Default `**/main.ts`, `**/cli.ts`, `**/bin/**`. `index.ts` is excluded on purpose: it is usually a barrel, and exempting it would let adapters reach the rest of the application through re-exports.
- **`testFiles`**, used by [`run-only-in-runner`](#run-only-in-runner), [`adapter-import-boundary`](#adapter-import-boundary), [`no-effect-promise`](#no-effect-promise), [`provide-named-layer`](#provide-named-layer), [`no-provide-on-definition`](#no-provide-on-definition), [`error-handling-in-effect-fn-handler`](#error-handling-in-effect-fn-handler), [`all-errors-handled-at-boundary`](#all-errors-handled-at-boundary) and [`anti-slop-no-service-constructor-imports`](#anti-slop-no-service-constructor-imports). Those rules skip test files; [`prefer-effect-vitest`](#prefer-effect-vitest) checks only them. Default `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**`. A helper directory such as `src/testing/` does not count as tests: it is support code.

The defaults come from a Node CLI. On another layout (Next.js, a monorepo) they must be reconfigured before reading the numbers, and every rule sharing an option must be reconfigured:

```ts
const entryFiles = ["apps/web/src/app/**/route.ts", "apps/web/src/runtime.ts"]

export default defineConfig({
    extends: [dlEffectAll],
    rules: {
        "dl-effect/run-only-in-runner": ["warn", { entryFiles }],
        "dl-effect/adapter-import-boundary": ["warn", { entryFiles }],
    },
})
```

## Services and Layers

### `service-port-shape-only`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a port is a shape-only `Context.Service`, with no implementation attached.

```ts
// no
class Agent extends Context.Service<Agent, Shape>()("app/Agent", { make: makeAgent }) {}

// yes
export class Agent extends Context.Service<
    Agent,
    { readonly search: (name: string) => Effect.Effect<RaceCard, AgentError> }
>()("app/agent/Agent") {}
```

**Trigger**: the second argument of `Context.Service<…>()(id, opts)`; a `static layer` or `static Default` member on the class; the v3 forms `Effect.Service`, `Context.Tag`, `Context.GenericTag`.

**Exemptions and blind spots**: a `Context.Service` assigned to a variable is not seen: see `service-not-as-class` (effecttsgo).

**Why**: `make` and a static layer tie the port to a default implementation, while the port must stay a contract any adapter can satisfy. It is a convention, not Effect's idiom: Effect's own docs put `static readonly layer` on the service.

- **Pattern**: P01 · **Options**: none · **Fix**: none · **Severity**: `error`

### `service-key-matches-name`

<sup>[↑ rules index](#rules-index)</sup>

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

**Trigger**: `class X extends Context.Service<…>()("key")` with a literal key that is neither `"X"` nor ends with `"/X"`.

**Exemptions and blind spots**: keys that are not literals (variables, templates with expressions). A `Context.Service` assigned to a variable is not seen: see `service-not-as-class` (effecttsgo). `deterministic-keys` (effecttsgo) with the `default` or `package-identifier` formula produces keys this rule accepts; with `default-hashed` the two contradict each other: enable only one.

**Why**: the key is the service's identity in errors, traces and `Context` lookups; a key that drifts from the name, as after a rename, makes it hard to find the class behind a message.

- **Pattern**: P38 · **Options**: none · **Fix**: suggestion that replaces the last segment of the key with the class name · **Severity**: —

### `service-built-with-of`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: the service a Layer provides is built with `Tag.of({…})`, not a bare object literal.

```ts
// no
export const RepoLive = Layer.effect(
    Repo,
    Effect.gen(function* () {
        const db = yield* Database
        return { find: (id: RepoId) => db.get(id) }
    }),
)

// yes
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

- **Pattern**: P41 · **Options**: none · **Fix**: suggestion that wraps the literal in `T.of(…)` · **Severity**: —

### `adapter-import-boundary`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: domain code and other adapters do not import an adapter; only entry files choose it.

```ts
// no: in src/orders/place-order.ts
import { GoogleCalendar } from "../calendar/google/GoogleCalendar.ts"

// yes: depend on the port, main.ts provides GoogleCalendar.layer
import { Calendar } from "../calendar/Calendar.ts"
```

**Trigger**: a relative import of a file in another directory that is an adapter: one of its `.ts` files (tests excluded) builds a `Layer` with `Layer.effect`, `succeed`, `sync`, `scoped`, `effectContext`, `unwrap`, `mock` and similar. Composition alone (`mergeAll`, `provide`, `merge`) does not make an adapter. It is the only rule that reads the filesystem.

**Exemptions and blind spots**: entry files, where adapters are chosen, and test files, which compose the Layers they exercise. Non-relative imports (path aliases such as `@/calendar/google`) and directory imports through an `index.ts` (`"../google"`) slip through. On a layout other than one directory per adapter, observe its behavior before trusting the numbers. Infrastructure requirements in the port's `R` channel need types: see `leaking-requirements` (effecttsgo).

**Why**: the adapter can be replaced without touching its consumers.

- **Pattern**: P02 · **Options**: `entryFiles`, `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: `error`

### `anti-slop-no-service-constructor-imports`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: runtime code obtains a service from its Layer, never by calling its `make…` constructor.

```ts
// no: in src/runtime.ts
import { makeIssueService } from "./issue-service.ts"

// yes
import { IssueService } from "./issue-service.ts"
const issues = yield * IssueService
```

**Trigger**: a named import of `make` followed by an uppercase letter (`makeIssueService`, also when renamed) from a relative module.

**Exemptions and blind spots**: test files, which build services from their constructors to inject fakes. Non-relative imports (packages, path aliases), namespace and default imports, and constructors with another prefix slip through. The same import can also fire [`adapter-import-boundary`](#adapter-import-boundary).

**Why**: calling the constructor wires its dependencies by hand, and its requirements stop propagating to the composition root.

- **Pattern**: — · **Options**: `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: —

### `run-only-in-runner`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: Effects run only in the program's runner, the entry point.

```ts
// no
export const check = () => Effect.runPromise(pingDb(url))

// yes: in main.ts
NodeRuntime.runMain(
    run(process.argv.slice(2)).pipe(Effect.provide(NodeServices.layer)) satisfies Effect.Effect<
        void,
        never
    >,
)
```

**Trigger**: every reference, not just calls, to `Effect.run*`, `NodeRuntime.runMain`, `BunRuntime.runMain` and `ManagedRuntime.make` outside entry files.

**Exemptions and blind spots**: test files, checked by [`prefer-effect-vitest`](#prefer-effect-vitest) instead.

**Why**: logger, Layers and defect handling are configured in one place.

- **Pattern**: P04 · **Options**: `entryFiles`, `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: `error`

### `prefer-effect-vitest`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: tests hand their Effects to `@effect/vitest` instead of running them.

```ts
// no
test("…", async () => {
    await Effect.runPromise(authorize({ role: "Manager" }))
})

// yes: fakes as Layers
import { effect } from "@effect/vitest"

effect("…", () => authorize({ role: "Manager" }).pipe(Effect.provide(sheetWith(row))))
```

**Trigger**: the same references as [`run-only-in-runner`](#run-only-in-runner), inside test files only.

**Exemptions and blind spots**: projects where `@effect/vitest` cannot be found in a `node_modules` from the test file up, since the remedy is out of reach there; scattered runs in their tests go unreported. Every file outside `testFiles`, test helpers such as `src/testing/` included.

**Why**: the test runtime brings `TestClock` and a scope per test, and fixtures provided as Layers replace services where the code reads them.

- **Pattern**: P22 · **Options**: `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: —

## Errors

### `no-bare-error-in-effect`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: an expected failure is a tagged error, never a thrown or primitive value.

```ts
// no
Effect.gen(function* () {
    if (tab === undefined) throw new Error("tab not found")
})
Effect.fail("tab not found")

// yes
export class SheetTabNotFoundError extends Schema.TaggedError<SheetTabNotFoundError>()(
    "SheetTabNotFoundError",
    { spreadsheetId: Schema.String, message: Schema.String },
) {}

Effect.fail(new SheetTabNotFoundError({ spreadsheetId, message: "tab not found" }))
```

**Trigger**: a `throw` directly inside a generator passed to `Effect.gen`/`Effect.fn`; `Effect.fail` with a literal or a template.

**Exemptions and blind spots**: a `throw` inside a nested callback. `Effect.fail(new Error(…))` and `class X extends Error`: see `global-error-in-effect-failure` and `extends-native-error` (effecttsgo).

**Why**: the typed error channel discriminates only on tags. A `throw` in the generator becomes a defect, outside the error channel.

- **Pattern**: P05 · **Options**: none · **Fix**: none · **Severity**: `error`

### `try-object-form`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: `Effect.try` and `Effect.tryPromise` take `{ try, catch }`, with `catch` producing a tagged error.

```ts
// no
Effect.tryPromise(() => api.spreadsheets.get({ spreadsheetId }))

// yes
Effect.tryPromise({
    try: () => api.spreadsheets.get({ spreadsheetId }),
    catch: toSheetError(spreadsheetId),
})
```

**Trigger**: `Effect.try` and `Effect.tryPromise` whose argument is not an object literal.

**Exemptions and blind spots**: an options object held in a variable is reported too.

**Why**: the thunk form types the error as `Cause.UnknownError` (`UnknownException` in v3), which no caller can handle by tag.

- **Pattern**: P08 · **Options**: none · **Fix**: none · **Severity**: `error`

### `no-effect-promise`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a promise that can reject is lifted with [`Effect.tryPromise`](#try-object-form), not `Effect.promise`.

```ts
// no
Effect.promise(() => client.connect())

// yes
Effect.tryPromise({ try: () => client.connect(), catch: toConnectionError })
```

**Trigger**: `Effect.promise` outside the release step of `acquireRelease`, `acquireUseRelease` and `addFinalizer`.

**Exemptions and blind spots**: the release step, where a promise that cannot reject is the normal case. Test files, where a rejection during setup is a broken test and the defect fails it with the cause. Elsewhere, a promise that truly cannot reject must be suppressed by hand.

**Why**: `Effect.promise` turns a rejection into a defect.

- **Pattern**: P08 · **Options**: `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: `warn`

### `no-parameterless-catch-all`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: errors are caught by tag; a catch-all never ignores what it catches.

```ts
// no
Effect.catch(() => Effect.succeed(fallback))

// yes
Effect.catchTag("AgentTimeout", () => Effect.succeed(skip))
Effect.catchTag(["ParseError", "ReservedPortError"], () => Effect.succeed(3000))
Effect.orElseSucceed(() => fallback)
```

**Trigger**: `Effect.catch`, `catchAll`, `catchCause` and `catchEager` with a parameterless handler.

**Exemptions and blind spots**: a catch-all that discriminates on `_tag` by hand: see [`anti-slop-no-manual-effect-error-tag`](#anti-slop-no-manual-effect-error-tag), and `catch-all-to-map-error`, `catch-all-tag-dispatch-to-catch-tag` and `catch-to-ignore` (effecttsgo).

**Why**: a catch-all that ignores its parameter also swallows the errors added later, which `catchTag` would leave visible in the type.

- **Pattern**: P09 · **Options**: none · **Fix**: none · **Severity**: `error`

### `anti-slop-no-manual-effect-error-tag`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a catch handler does not discriminate errors by `_tag`; `catchTag` and `catchReason` do.

```ts
// no
program.pipe(Effect.catch((error) => (error._tag === "NotFound" ? recover : Effect.fail(error))))

// yes
program.pipe(Effect.catchTag("NotFound", () => recover))
```

**Trigger**: an equality comparison between `_tag` (or `reason._tag`) and a string literal, or a `switch` on `_tag`, whose nearest enclosing function is a handler passed to `Effect.catch`, `catchAll` or `catchIf`. On `reason._tag` the message proposes `Effect.catchReason(s)`.

**Exemptions and blind spots**: handlers of other combinators (`catchTag`, `catchCause`, `mapError`), and `_tag` checks in a function nested inside the handler. Outside these handlers the same checks belong to [`no-manual-discriminant-comparison`](#no-manual-discriminant-comparison): the two never fire on the same node.

**Why**: a hand-written dispatch keeps the caught errors in the type even when handled, and silently misses tags added later.

- **Pattern**: — · **Options**: none · **Fix**: none · **Severity**: —

## Tagged values

### `no-manual-discriminant-comparison`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: branching on a union's discriminant goes through an exhaustive match, never through comparisons or `switch`.

```ts
// no
switch (event._tag) {
    case "Created":
        return onCreated(event)
    case "Deleted":
        return onDeleted(event)
}

// yes
Match.value(event).pipe(Match.tagsExhaustive({ Created: onCreated, Deleted: onDeleted }))

// yes, with `discriminants: ["_tag", "type"]`
Match.value(payment).pipe(
    Match.discriminatorsExhaustive("type")({ card: fromCard, transfer: fromTransfer }),
)
```

**Trigger**: an equality comparison between a discriminant (also `["type"]`) and a string literal, or a `switch` on a discriminant. The discriminants are the names in `discriminants`.

**Exemptions and blind spots**: comparisons against a variable rather than a literal. On `_tag`, the handlers covered by [`anti-slop-no-manual-effect-error-tag`](#anti-slop-no-manual-effect-error-tag): the two never fire on the same node. Guard clauses such as `if (x.type === "a") return …` fire too; on `_tag` use `Predicate.isTagged`. An exhaustive ts-pattern match is an equally valid remedy. A name added to `discriminants` also fires on objects outside closed unions (DOM events, external payloads): the list is a choice of the codebase.

**Why**: `Match.tagsExhaustive`, `Match.discriminatorsExhaustive` and `$match` fail to compile when a variant is added; a comparison or a `switch` does not.

- **Pattern**: P36 · **Options**: `discriminants`, replaces the default `["_tag"]`; add the fields your unions discriminate on (`type`, `kind`) · **Fix**: none · **Severity**: —

### `no-manual-discriminant-construction`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a union's variant is built by its constructor, never as an object literal with the discriminant.

```ts
// no
const error = { _tag: "NotFound", id }

// yes
const error = new NotFound({ id })

// no, with `discriminants: ["_tag", "eventType"]`
const event = { eventType: "PaymentStarted", id, payment }

// yes
const event = PaymentStartedEvent.make({ id, payment })
```

**Trigger**: an object literal with a discriminant property (also `"type"` or `["type"]`) whose value is a string literal. The discriminants are the names in `discriminants`.

**Exemptions and blind spots**: values that are not literals (`"Ready" as const` included). Literals that are patterns or raw input, also nested: the arguments of `Match.when`, `Match.not`, of `.with(…)` on a ts-pattern `match(…)` chain, and the input of `Schema.decode*(X)(…)`/`Schema.encode*(X)(…)`. Transport payloads written as literals fire, and a name added to `discriminants` fires on objects outside closed unions: the list is a choice of the codebase. See `schema-struct-with-tag` (effecttsgo) for `Schema.Struct` with a `_tag` field.

**Why**: a literal skips the constructor, so it carries none of the class's prototype, equality or validation, and drifts silently when the type changes.

- **Pattern**: P37 · **Options**: `discriminants`, shared with [`no-manual-discriminant-comparison`](#no-manual-discriminant-comparison), default `["_tag"]` · **Fix**: none · **Severity**: —

## Config

### `redacted-secret-names`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a secret read from config or declared in a schema is `Redacted`.

```ts
// no
serviceAccount: Config.schema(NonBlank, "GOOGLE_SERVICE_ACCOUNT_JSON")
const Session = Schema.Struct({ userId: UserId, accessToken: Schema.String })

// yes
serviceAccount: Config.schema(Schema.Redacted(NonBlank), "GOOGLE_SERVICE_ACCOUNT_JSON")
const Session = Schema.Struct({ userId: UserId, accessToken: Schema.Redacted(Schema.String) })
```

**Trigger**:

- a literal name read with `Config.*` that ends with `KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `CREDENTIAL`, `CREDENTIALS` or `_JSON` (service account keys often travel as inline JSON), when it does not go through `Config.redacted` or `Config.schema(Schema.Redacted…(…), name)`;
- a field of `Schema.Struct({…})` or `Schema.Class<X>("X")({…})` whose name is a `secretFields` entry or ends with it capitalized (`password` matches `dbPassword`), declared with a `Schema.*` constant such as `Schema.String`, also through `.pipe(…)`, `.check(…)`, `.annotate(…)` or `Schema.optional`/`optionalKey`/`NullOr`/`UndefinedOr`/`NullishOr`, with no `Schema.Redacted…` along the way.

**Exemptions and blind spots**: a naming heuristic: secrets with other names slip through, non-secrets with these names must be suppressed. Fields declared with a named schema (`accessToken: AccessToken`) are not inspected; other constructors (`Schema.TaggedClass`, `Schema.TaggedStruct`, …) are not seen. `process.env` read outside `Config`: see `process-env` and `process-env-in-effect` (effecttsgo).

**Why**: a `Redacted` value does not end up in logs or `toString`.

- **Pattern**: P13 · **Options**: `secretFields`, default `["password", "secret", "apiKey", "accessToken", "refreshToken", "idToken"]` (no generic `token`), replaced by the configured list; `Config` names are fixed · **Fix**: none · **Severity**: `warn`

## Schema

### `exported-schema-identifier`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: an exported schema carries an `identifier` equal to its name.

```ts
// no
export const EventBusEvents = Schema.Union([Created, Deleted])

// yes
export const EventBusEvents = Schema.Union([Created, Deleted]).annotate({
    identifier: "EventBusEvents",
})
```

**Trigger**: `export const X = Schema.Struct(…)`, `Schema.Union(…)` or `Schema.Array(…)`, also followed by `.pipe(…)`, `.annotate(…)` or `.check(…)`, with no `identifier` in a `.annotate(…)` or `Schema.annotate(…)` of the chain, or with a literal `identifier` other than `"X"`.

**Exemptions and blind spots**: non-exported schemas (fragments reused through `.fields`), and `Schema.Class` and `Schema.TaggedError`, which carry the name already. A computed `identifier` is not compared. Other constructors (`Schema.TaggedStruct`, `Schema.Literals`, …), `export { X }` lists and chains through other methods slip through. An exported fragment reused only through `.fields` fires too, although the annotation does not reach the schemas that spread it: export the plain fields object instead (`export const BaseFields = { … }`).

**Why**: without an `identifier`, decoding errors, JSON Schema and arbitraries describe the schema by its structure instead of its name.

- **Pattern**: P35 · **Options**: none · **Fix**: suggestion that adds or corrects the `identifier` · **Severity**: —

### `no-inline-schema-codec`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a decoder or encoder is a named module-level constant, not built and applied inline.

```ts
// no
const toPayment = (raw: unknown) => Schema.decodeUnknownSync(PaymentResponse)(raw)

// yes
const decodePaymentResponse = Schema.decodeUnknownSync(PaymentResponse)

const toPayment = (raw: unknown) => decodePaymentResponse(raw)
```

**Trigger**: an immediate application `Schema.decode*(X)(input)` or `Schema.encode*(X)(input)` (the `Effect`, `Exit`, `Option`, `Promise`, `Result` and `Sync` variants, `Unknown` included) inside a function, test callbacks included.

**Exemptions and blind spots**: module scope, and the generator of `Layer.effect(T, Effect.gen(…))` or `Layer.effect(T)(Effect.gen(…))` (also `Layer.scoped`), which run once; functions nested in that generator, such as the service methods, are checked. Codecs built inside a function and applied later (`const decode = Schema.decodeUnknownEffect(X)`), codecs passed as callbacks (`Effect.flatMap(Schema.decodeUnknownEffect(X))`) and a Layer built through `.pipe(Layer.effect(T))` slip through. Whether the codec should be synchronous is not this rule's concern: see `schema-sync` (effecttsgo).

**Why**: a named codec says what it decodes at the call site and is built once, instead of at every call.

- **Pattern**: P39 · **Options**: none · **Fix**: none · **Severity**: —

## Effectful functions

### `prefer-effect-fn`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: an effectful function is `Effect.fn("name")`, and a named effect value has a span.

```ts
// no
const outcomeFor = (name: string) => Effect.gen(function* () { … }).pipe(Effect.catch(toFailed))
const refresh = Effect.gen(function* () { … })

// yes: extra combinators as arguments, not .pipe
const outcomeFor = Effect.fn("outcomeFor")(function* (name: string) { … }, Effect.catch(toFailed))
const refresh = Effect.gen(function* () { … }).pipe(Effect.withSpan("refresh"))
```

**Trigger**:

- a declared function, a variable or an object member that only returns `Effect.gen(…)`, even with `.pipe`;
- a variable or an object member whose value is `Effect.gen(…)` without `Effect.withSpan` in its `.pipe`;
- `Effect.fn(body)` without a name;
- `.pipe` on `Effect.fn(…)(…)`.

**Exemptions and blind spots**: `Effect.gen` inline as an argument (`Layer.effect(Tag, Effect.gen(…))`, `Stream.unwrap`, callbacks, `it.effect`). Recursive functions: see [`untraced-recursion`](#untraced-recursion).

**Why**: named stack traces and spans without wrapper functions. Combinators passed as arguments run inside the function's span and receive its arguments: `(effect, name) => effect.pipe(…)`.

- **Pattern**: P17 · **Options**: none · **Fix**: none · **Severity**: `warn`

### `untraced-recursion`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a recursive effectful function uses `Effect.fnUntraced`; the entry point that starts the recursion is traced.

```ts
// no
const walk = Effect.fn("walk")(function* (node: Node) {
    for (const child of node.children) yield* walk(child)
})

// yes
const walk = Effect.fnUntraced(function* (node: Node) {
    for (const child of node.children) yield* walk(child)
})
export const scan = Effect.fn("scan")(function* (root: Node) {
    return yield* walk(root)
})
```

**Trigger**: an `Effect.fn` assigned to a variable that its own body calls again, even by passing it as a callback.

**Exemptions and blind spots**: mutual recursion, recursion in pipeables.

**Why**: with `Effect.fn` every level opens a span nested in the previous one.

- **Pattern**: P17 · **Options**: none · **Fix**: none · **Severity**: `warn`

### `single-style-per-function`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a function is entirely Effect or not Effect at all.

```ts
// no
export const POST = async (request: Request) => {
    const form = await request.formData()
    const created = await Effect.runPromise(Effect.either(createEvent(form)))
    // …
}

// yes: promises lifted with Effect.tryPromise
const createEvent = Effect.fn("events.create")(function* (request: Request) {
    const form = yield* Effect.tryPromise({
        try: () => request.formData(),
        catch: () => new BadRequest({ message: "invalid form data" }),
    })
    // …
})
```

**Trigger**: `async`, `await` and `.then(` in a function that builds Effects: an Effect generator, or a function using an `Effect.*` member. A `test`/`it` callback (`.only`, `.each(…)` and the like included) or a `beforeAll`/`afterAll`/`beforeEach`/`afterEach` hook is reported once, on the callback, when more than one of its `await`s, or any `.then(`, involves Effect: has an `Effect.*` member in its expression, nested callbacks and `Effect.run*` included.

**Exemptions and blind spots**: `Effect.run*` alone does not make a function effectful: it is how an async boundary hands over to Effect, and where it may appear is decided by [`run-only-in-runner`](#run-only-in-runner). An `async` function that renders JSX itself, not only in nested callbacks, is a Server Component: how it turns failures into UI is left to the application. A test or hook may await promise-based fixtures (a container, an identity provider), then one Effect program, and assert on its result. A step that reaches Effect only through a helper (`await run(seed)`) is not counted.

**Why**: errors travel on two channels, exceptions and Effect, and neither sees them all.

- **Pattern**: P24 · **Options**: none · **Fix**: none · **Severity**: `error`

### `error-handling-in-effect-fn-handler`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: the generator holds only the happy path; error handling lives in the second argument of `Effect.fn`.

```ts
// no
function* () {
    const x = yield* fetchThing.pipe(Effect.catchTag("NotFound", () => Effect.succeed(fallback)))
}

// yes: naming the error or giving an alternative is not handling
function* () {
    const x = yield* fetchThing.pipe(Effect.orElseSucceed(() => fallback))
    const y = yield* decode(raw).pipe(Effect.mapError((error) => new BadRequest({ message: error.message })))
}

// yes: translation in the second argument, which also receives the original arguments
const createEvent = Effect.fn("events.create")(
    function* (request: Request) { /* success only */ },
    (effect, request) => effect.pipe(Effect.catchTags({ BadRequest: (e) => refused(400, e.message) })),
)
```

**Trigger**: inside a generator passed to `Effect.gen`/`Effect.fn`, nested callbacks included, calls to `Effect.catch*` (`catch`, `catchAll`, `catchTag`, `catchTags`, `catchIf`, `catchCause`, `catchDefect`, `catchReason`, …), `either`, `result`, `exit`, `match*` and `sandbox`.

**Exemptions and blind spots**: pipeables of a nested `Effect.fn`. Test files, where the failure is the outcome under observation (`yield* Effect.result(op)` then `expect`). A `.pipe(Effect.catch…)` appended to an `Effect.gen` escapes; [`prefer-effect-fn`](#prefer-effect-fn) closes that gap.

**Why**: translation becomes a single exhaustive point instead of catches scattered along the flow.

- **Pattern**: P25 · **Options**: `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: `warn`

### `no-transport-types-in-generator`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: the generator returns a domain value; conversion to a transport type happens in the second argument of `Effect.fn`.

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
        const credential = yield* sessionCredential // fails with Unauthenticated
        const submission = yield* form(request)
        return yield* apiCreateEvent(credential, submission)
    },
    (effect, request) =>
        effect.pipe(
            Effect.map((created) => Response.redirect(eventUrl(request, created), 303)),
            Effect.catchTags({ Unauthenticated: () => Effect.succeed(toLogin(request)) }),
        ),
)
```

**Trigger**: `new T(…)`, `T.method(…)` and `T(…)` inside an Effect generator, nested callbacks included, when `T` is a transport type.

**Exemptions and blind spots**: pipeables of `Effect.fn`, where the conversion must live. `return yield* new Unauthenticated(…)` is a declared failure. An early `return` of a domain value that actually signals an error is indistinguishable from a success.

**Why**: an early `return new Response(…)` on the happy path is an error branch disguised as success, and escapes exhaustive translation.

- **Pattern**: P26 · **Options**: `transportTypes`, replaces the default `["Response", "NextResponse"]`; add your own transport DTOs · **Fix**: none · **Severity**: `error`

### `all-errors-handled-at-boundary`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: the entry point runs an Effect whose error channel is closed to `never`.

```ts
// no
export const POST = (request: Request) => Effect.runPromise(createEvent(request))

// yes: in an entry file
export const POST = (request: Request) =>
    Effect.runPromise(createEvent(request) satisfies Effect.Effect<Response, never>)

// yes: a typed helper
const runBoundary = (effect: Effect.Effect<Response, never, never>) => Effect.runPromise(effect)
```

**Trigger**: `Effect.runPromise`, `runSync`, `runFork`, `runCallback` and `NodeRuntime.runMain`/`BunRuntime.runMain` whose argument is neither `… satisfies Effect.Effect<A, never>` nor a parameter declared with that type.

**Exemptions and blind spots**: the `*Exit` variants, which return failures as values; runners inside an `async` function that renders JSX itself, a Server Component, which hands failures to React rather than to an HTTP response; test files, where a rejected run fails the test with the error. The rule checks the shape; `tsc` gives the guarantee.

**Why**: `Effect.runPromise` turns any error left over into a rejected promise, a generic 500. With `never`, a new untranslated error does not compile, and `R = never` forces all Layers to be provided.

- **Pattern**: P27 · **Options**: `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: `warn`

## Wiring and code shape

### `provide-named-layer`

<sup>[↑ rules index](#rules-index)</sup>

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

- **Pattern**: P28 · **Options**: `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: `error`

### `no-provide-on-definition`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a program does not provide its own Layers; its caller does.

```ts
// no
const printMissing = Effect.gen(function* () { … }).pipe(Effect.provide(missingLayer))

// yes: see provide-named-layer
```

**Trigger**: `Effect.provide` applied to `Effect.gen(…)` or to `Effect.fn(…)(…)`, in all three forms: with `.pipe`, as an `Effect.fn` pipeable, data-first.

**Exemptions and blind spots**: test files. A context captured in an enclosing generator with `const ctx = yield* Effect.context<R>()` (also followed by `.pipe(…)`) and handed back to a method of the Layer being built: the caller chose the adapters when it built the Layer. A context obtained through a helper (`yield* contextWithoutSpan()`) is still reported. `provide` on a named program is allowed; `strict-effect-provide` (effecttsgo) reports it too.

**Why**: a program that provides its own Layers can no longer be wired to different adapters by its caller.

- **Pattern**: P28 · **Options**: `testFiles` ([File options](#file-options)) · **Fix**: none · **Severity**: `error`

### `no-nested-match`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a match handler contains neither another match nor a ternary.

```ts
// no
const run = (argv: ReadonlyArray<string>) =>
    Result.match(parseArgs(argv), {
        onFailure: usageError,
        onSuccess: (command) =>
            Option.match(command.only, { onNone: () => fillAll, onSome: fillOnly }),
    })

// yes, outside a generator: a named handler
const fill = (command: CliCommand) =>
    Option.match(command.only, { onNone: () => fillAll, onSome: fillOnly })

const run = (argv: ReadonlyArray<string>) =>
    Result.match(parseArgs(argv), { onFailure: usageError, onSuccess: fill })

// yes, inside a generator: guard clauses
const run = Effect.fn("run")(function* (argv: ReadonlyArray<string>) {
    const parsed = parseArgs(argv)
    if (Result.isFailure(parsed)) return yield* usageError(parsed.failure)

    const { only } = parsed.success
    if (Option.isNone(only)) return yield* fillAll

    return yield* fillOnly(only.value)
})
```

**Trigger**: a handler of `Option.match`, `Result.match`, `Exit.match`, `Either.match`, `$match` or `Match.valueTags` that is itself a data-last match (also `Match.type().pipe(…)` and `pipe(Match.type(), …)`), or that returns a match, a `Match.value(…).pipe(…)` or `pipe(Match.value(…), …)` chain or a ternary.

**Exemptions and blind spots**: `if` inside handlers, and whatever they return from inside an `if` or another nested block; the handlers of an outer `Match.value`/`Match.type` chain; matches nested deeper than the returned value, or assigned to a variable before being returned.

**Why**: two nested levels of choice hide which branch is the normal one.

- **Pattern**: P30 · **Options**: none · **Fix**: none · **Severity**: `warn`

### `no-yielded-match`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: inside an Effect generator, return early on the empty or failed case instead of yielding a match.

```ts
// no
const save = Effect.fn("save")(function* (id: PolicyId) {
    const found = yield* findPolicy(id)
    return yield* Option.match(found, {
        onNone: () => register(id),
        onSome: (policy) => update(policy),
    })
})

// yes
const save = Effect.fn("save")(function* (id: PolicyId) {
    const found = yield* findPolicy(id)
    if (Option.isNone(found)) return yield* register(id)

    return yield* update(found.value)
})
```

**Trigger**: `yield*` of `Option.match(x, {…})` or `Result.match(x, {…})`, or of a `x.pipe(…)`/`pipe(x, …)` ending in `Option.match({…})`/`Result.match({…})`, in the generator of `Effect.gen` or `Effect.fn`.

**Exemptions and blind spots**: an `Option.match` with `onNone` → `Effect.fail(…)` and `onSome` → `Effect.succeed`: see `option-match-to-from-option` (effecttsgo). A handler that `no-nested-match` reports. Matches not yielded directly (assigned first, or inside `Effect.flatMap`) slip through.

**Why**: the match splits the generator into two equal-weight branches; a guard clause leaves one main path of `yield*`.

- **Pattern**: P40 · **Options**: none · **Fix**: none · **Severity**: —

### `no-inline-yield-star`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a `yield*` result is bound to a `const` before being used.

```ts
// no
return yield * missingIn(yield * readSheet())

// yes
const sheet = yield * readSheet()
return yield * missingIn(sheet)
```

**Trigger**: a `yield*` whose result is used inside a larger expression: argument, operand, member, property, template.

**Exemptions and blind spots**: a `yield*` that is the whole value of a statement (`yield* x`, `return yield* x`, `if (yield* x)`, `for (… of yield* x)`), a declaration or an assignment. Also the whole branch of a ternary, or the right operand of `&&`/`||`/`??`, in one of those positions (`const a = cached ?? (yield* x)`): binding first would run the effect unconditionally. The autofix extracts every nested `yield*` into `const`s, innermost first, named after the argument's last identifier without a verb prefix (`readSheet()` → `sheet`). There is no autofix when moving the effect could change when or how often it runs: branches of a ternary or `&&`/`||`/`??` inside a larger expression, optional chaining, `while`/`for` conditions, statements without braces, another call evaluated before the `yield*`.

**Why**: with several `yield*`s in one expression the order of effects can only be inferred from precedence. One `const` per effect makes the order the reading order and names the intermediate value.

- **Pattern**: P32 · **Options**: none · **Fix**: autofix · **Severity**: `warn`

### `no-effect-return-type`

<sup>[↑ rules index](#rules-index)</sup>

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

**Why**: the error and requirement channels collect what comes from everything the function calls; an error or a service added deep down would change every caller's annotation. An exported signature is the module's contract, like a named type: there the annotation makes such a change visible where it is published.

- **Pattern**: P33 · **Options**: `checkExported`, default `false`: also checks exported declarations · **Fix**: suggestion that removes the annotation · **Severity**: `warn`

### `no-asymmetric-match-handlers`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: if one match handler delegates to a named function, the others do too.

```ts
// no
Option.match(only, {
    onNone: () => missingIn(sheet),
    onSome: Effect.fn("onlyCandidate")(function* (name: string) { … }),
})

// yes
Option.match(only, {
    onNone: () => missingIn(sheet),
    onSome: (name) => onlyCandidate(sheet, name),
})
```

**Trigger**: on the same matches as [`no-nested-match`](#no-nested-match), a handler with an inline body next to one that delegates. A handler delegates if it is a reference, a call, or a function returning only a call; it is inline if it has multiple statements, is a generator, or builds an `Effect.fn`/`Effect.gen`.

**Exemptions and blind spots**: returned literals, templates, arrays and objects are values and count on neither side.

**Why**: a branch saying _what_ next to one showing _how_ forces the reader to switch level halfway through the choice.

- **Pattern**: P34 · **Options**: none · **Fix**: none · **Severity**: `warn`

### `anti-slop-prefer-effect-match`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: a choice among several literal values of the same expression is a `Match`, not a chain of ternaries.

```ts
// no
const label = kind === "a" ? "A" : kind === "b" ? "B" : "Other"

// yes
const label = Match.value(kind).pipe(
    Match.when("a", () => "A"),
    Match.when("b", () => "B"),
    Match.orElse(() => "Other"),
)
```

**Trigger**: a ternary chain of at least two levels where every condition compares the same expression, by source text, with a literal (`==`, `===`, `!=`, `!==`).

**Exemptions and blind spots**: a single ternary, chains comparing different expressions, and the same expression written differently (`a.b` vs `a["b"]`). A chain returned by a match handler also fires [`no-nested-match`](#no-nested-match): extract the handler first, since a `Match.value` left inside it fires `no-nested-match` again.

**Why**: a ternary chain hides which value is the fallback and cannot be made exhaustive.

- **Pattern**: — · **Options**: none · **Fix**: none · **Severity**: —
