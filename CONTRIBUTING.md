# Contributing

## Development

- `pnpm format`: formats with oxfmt; the only script that rewrites sources.
- `pnpm check`: format check, typecheck, lint and tests, writing nothing. The tests are the `RuleTester`s from `oxlint/plugins-dev` with `node --test`, plus a check that the rule catalog, `docs/user-guide/rules/`, has exactly one file per rule of the plugin.
- `pnpm build`: compiles to `dist/` and generates `dist/presets/all.json` from `src/presets/all.ts` (the rule list comes from the plugin).
- `pnpm pack:check`: checks the built preset, then the tarball `npm pack` would publish: only the files in `files`, no local absolute paths, `publint --strict`.
- `pnpm consumer-test`: installs the tarball in `consumer-fixture/` with pnpm and checks the diagnostics of oxlint with each config form: `oxlint.config.ts` and `.oxlintrc.json` with the preset, `.oxlintrc.json` with the plugin by package name.
- `pnpm build-and-pack`: `check`, `build`, `pack:check` and `consumer-test`; run it after every change.
- `pnpm release <bump>`: from a clean `main` equal to `origin/main`, runs `build-and-pack`, bumps with `npm version <bump> --preid rc` (`prerelease` for the next rc, `x.y.z` for a stable), publishes, then pushes the commit and the tag. A prerelease is `next`, and also `latest` until the first stable version; a stable version is `latest` and `next`. A failed publish undoes the bump. Without `<bump>`, prints the version in `package.json` and the npm dist-tags.
- `pnpm build:w`: reruns `pnpm build`, preset included, on every change to `src/` or `tsconfig.build.json`; a failed build waits for the next change.
- `pnpm consumer:link <consumer>`: after `pnpm build`, replaces the pnpm symlinks of the plugin in every workspace package of `<consumer>` with links to the checkout, so the consumer's own lint runs the checkout's rules; no tracked file of the consumer changes. `pnpm consumer:unlink <consumer>` restores them with `pnpm install --frozen-lockfile`, as does any `pnpm install` in the consumer.

A new rule must be registered in `src/index.ts`, documented in its rule file, `docs/user-guide/rules/<rule-name>.md` (see [`docs/rules-catalog-style.md`](docs/rules-catalog-style.md)), and linked from its topic in the rules index, `docs/user-guide/rules.md`; `pnpm build` adds it to the preset.
