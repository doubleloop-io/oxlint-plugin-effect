# @doubleloop-io/oxlint-plugin-effect

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
