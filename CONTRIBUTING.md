# Contributing

## Development

- `pnpm format`: formats with oxfmt; the only script that rewrites sources.
- `pnpm check`: format check, typecheck, lint and tests, writing nothing. The tests are the `RuleTester`s from `oxlint/plugins-dev` with `node --test`, plus a check that the rule catalog, `docs/user-guide/rules/`, has exactly one file per rule of the plugin.
- `pnpm build`: compiles to `dist/` and generates `dist/presets/all.json` from `src/presets/all.ts` (the rule list comes from the plugin).
- `pnpm pack:check`: checks the built preset, then the tarball `npm pack` would publish: only the files in `files`, no local absolute paths, `publint --strict`.
- `pnpm consumer-test`: installs the tarball in `scripts/consumer-fixture/` with pnpm and checks the diagnostics of oxlint with each config form: `oxlint.config.ts` and `.oxlintrc.json` with the preset, `.oxlintrc.json` with the plugin by package name.
- `pnpm build-and-pack`: `check`, `build`, `pack:check` and `consumer-test`; run it after every change.
- `pnpm changeset-version`: `changeset version`, then `pnpm format` so the generated changelog passes `format:check`; the release workflow runs it for the version pull request.
- `pnpm changeset-publish`: `build-and-pack`, then `changeset publish`; the release workflow runs it, and it is not a supported path from a local machine.
- `pnpm changeset-status`: `changeset status --verbose`, the plan of the next release.
- `pnpm build:w`: reruns `pnpm build`, preset included, on every change to `src/` or `tsconfig.build.json`; a failed build waits for the next change.
- `pnpm consumer:link <consumer>`: after `pnpm build`, replaces the pnpm symlinks of the plugin in every workspace package of `<consumer>` with links to the checkout, so the consumer's own lint runs the checkout's rules; no tracked file of the consumer changes. `pnpm consumer:unlink <consumer>` restores them with `pnpm install --frozen-lockfile`, as does any `pnpm install` in the consumer.

A new rule must be registered in `src/index.ts`, documented in its rule file, `docs/user-guide/rules/<rule-name>.md` (see [`docs/rules-catalog-style.md`](docs/rules-catalog-style.md)), and linked from its topic in the rules index, `docs/user-guide/rules.md`; `pnpm build` adds it to the preset.

## Releasing

Merging the "Version Packages" pull request is the release: GitHub Actions publishes to npm with OIDC, so it needs neither a local machine nor an npm token.

1. A change users can notice carries a changeset, whether it arrives by pull request or by a direct commit on `main`: a file in `.changeset/`, written by hand or with `pnpm changeset`. Doc-only, CI and tooling changes do not carry one. Nothing requires it: the reminder is changeset-bot, non-blocking, and there is no `changeset status` check in CI.
2. On every push to `main` with changesets pending, the release workflow opens or updates the "Version Packages" pull request with the next version and changelog, computed by `pnpm changeset-version`. Its diff shows what ships; locally, `pnpm changeset-status` prints the plan of the next release, and exits with an error when a branch has changes and no changeset.
3. Before merging it, check for changes that should have had a changeset, direct commits especially, and add the missing ones.
4. Merging it runs `pnpm changeset-publish`: `build-and-pack`, since that pull request runs no CI, then `changeset publish`, which publishes only versions missing from npm. The workflow also creates the `v<version>` tag and the GitHub Release.

The bump: a new rule is minor, because the `all` preset enables it at `warn`; a fix is patch; a breaking change is minor while the plugin is in `0.x`.

### Release candidates

Stable versions go to the `latest` dist-tag, and only there. Release candidates, `x.y.z-rc.n`, go to the `rc` dist-tag, so a plain install keeps getting the stable version. `next` is retired.

- To start, run `pnpm changeset pre enter rc` and push the resulting `.changeset/pre.json` to `main`. While it is there, every release is an `rc`, made in the same way: changesets, then the version pull request.
- To finish, run `pnpm changeset pre exit` and push the change to `main`. The next version pull request holds the stable version.

### A failed publish

Re-run the failed job of the release workflow: it publishes only what is missing from npm.

If the failure comes from the code, push the fix to `main` without a changeset. This is the exception to "a change users can notice carries a changeset": the unpublished version already carries the changelog entry, and a new changeset would bump it again, so that version would never be published. A push with no changeset pending runs the publish, so that run publishes the version. Because every such push runs `build-and-pack`, a break there also fails the release run of an unrelated push, with nothing to release.

A re-run does not recreate a GitHub Release. The action creates one only for a tag `changeset publish` has just created, and that command skips a tag that already exists and creates none when the version is already on npm, so if the publish reached npm and the run failed afterwards, the re-run passes with no Release, and with no tag if the first run did not push it. Create the Release by hand, with the version's changelog entry as notes and `--prerelease` for an `rc`; it also creates the tag if missing, on the commit given to `--target`:

```sh
gh release create v<version> --title v<version> --target <commit> --notes-file <file>
```
