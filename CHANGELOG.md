# @doubleloop-io/oxlint-plugin-effect

## 0.1.2

### Patch Changes

- [#42](https://github.com/doubleloop-io/oxlint-plugin-effect/pull/42) [`00de7c6`](https://github.com/doubleloop-io/oxlint-plugin-effect/commit/00de7c6780be261181bd49e34c183f020733754f) Thanks [@iacoware](https://github.com/iacoware)! - `no-inline-yield-star` adds a hint when the `yield*` sits inside a larger conditional branch, where binding it first would run it unconditionally: extract the effect into a named function and transform its result inside it (`Effect.map`), so the branch is a single `yield*`.

- [#41](https://github.com/doubleloop-io/oxlint-plugin-effect/pull/41) [`a71cd0f`](https://github.com/doubleloop-io/oxlint-plugin-effect/commit/a71cd0fbcc82be7e9961550ec4924ae483b64016) Thanks [@iacoware](https://github.com/iacoware)! - `no-inline-yield-star` autofix names a `const` whose name is taken after the object it is read from (`reader.rows` → `readerRows`, `Effect.scope` → `effectScope`) before falling back to a numeric suffix.

- [#39](https://github.com/doubleloop-io/oxlint-plugin-effect/pull/39) [`469f03d`](https://github.com/doubleloop-io/oxlint-plugin-effect/commit/469f03d1eb92126a918d8cf456e8483b05c4fdd9) Thanks [@d4v1d82](https://github.com/d4v1d82)! - Prevent `no-inline-yield-star` autofixes from generating duplicate `const` bindings when multiple statements in the same generator extract the same base name.

## 0.1.1

### Patch Changes

- [`2c67281`](https://github.com/doubleloop-io/oxlint-plugin-effect/commit/2c672814db1d169752d04295374001b935b785f5) Thanks [@iacoware](https://github.com/iacoware)! - The documentation has a website, now the package homepage: https://doubleloop-io.github.io/oxlint-plugin-effect/

    - The rule catalog moves from `RULES.md`, no longer in the package, to one file per rule in `docs/user-guide/rules/`; the guide ships in the package.
    - The README becomes the essential guide and links to the website.
    - New Troubleshooting page.
    - Improve rules documentation.

## 0.1.0

First stable release.

- 30 rules for Effect code, grouped by topic in [`docs/user-guide/rules.md`](docs/user-guide/rules.md): error channel, tagged values, services and Layers, runtime and entry point, design and boundaries, effectful functions, code shape, Schema, config and secrets. Three are absorbed from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop).
- An `all` preset that enables every rule at `warn`, for `oxlint.config.ts` and `.oxlintrc.json`.
- Shared settings under `settings["dl-effect"]`: `entryFiles`, `testFiles`, `discriminants`.
- Written for Effect 4; rules also recognize the Effect 3 name of the same API.
- Requires Node `^22.20.0 || >=24.8.0` and oxlint `^1.82.0`.
