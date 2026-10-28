# @doubleloop-io/oxlint-plugin-effect

## 0.1.0

First stable release.

- 30 rules for Effect code, grouped by topic in [`docs/user-guide/rules.md`](docs/user-guide/rules.md): error channel, tagged values, services and Layers, runtime and entry point, design and boundaries, effectful functions, code shape, Schema, config and secrets. Three are absorbed from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop).
- An `all` preset that enables every rule at `warn`, for `oxlint.config.ts` and `.oxlintrc.json`.
- Shared settings under `settings["dl-effect"]`: `entryFiles`, `testFiles`, `discriminants`.
- Written for Effect 4; rules also recognize the Effect 3 name of the same API.
- Requires Node `^22.20.0 || >=24.8.0` and oxlint `^1.82.0`.
