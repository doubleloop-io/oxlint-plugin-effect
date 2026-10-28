---
title: redacted-secret-names
group: Config and secrets
---

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

- a literal name read with `Config.*` that ends with `KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `CREDENTIAL`, `CREDENTIALS` or `_JSON` (service account keys often travel as inline JSON), when it does not go through `Config.Redacted`, the v3 `Config.redacted` (also wrapping a config, `Config.redacted(Config.string(name))`), or `Config.schema(Schema.Redacted…(…), name)`;
- a field of `Schema.Struct({…})` or `Schema.Class<X>("X")({…})` whose name is a `secretFields` entry or ends with it capitalized (`password` matches `dbPassword`), declared with a `Schema.*` constant such as `Schema.String`, also through `.pipe(…)`, `.check(…)`, `.annotate(…)`/`.annotations(…)` or `Schema.optional`/`optionalKey`/`optionalWith`/`NullOr`/`UndefinedOr`/`NullishOr`, with no `Schema.Redacted…` along the way.

**Exemptions and blind spots**: a naming heuristic: secrets with other names slip through, non-secrets with these names must be suppressed. Fields declared with a named schema (`accessToken: AccessToken`) are not inspected; other constructors (`Schema.TaggedClass`, `Schema.TaggedStruct`, …) are not seen. `process.env` read outside `Config`: see `process-env` and `process-env-in-effect` (effecttsgo).

**Why**: a `Redacted` value does not end up in logs or `toString`.

**Options**:

- `secretFields`: default `["password", "secret", "apiKey", "accessToken", "refreshToken", "idToken"]` (no generic `token`), replaced by the configured list. `Config` names are fixed.

**Fix**: none
