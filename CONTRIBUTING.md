# Contributing

## Development

- `pnpm format`: formats with oxfmt; the only script that rewrites sources.
- `pnpm check`: format check, typecheck, lint and tests, writing nothing. The tests are the `RuleTester`s from `oxlint/plugins-dev` with `node --test`, plus a check that the rule catalog, `docs/user-guide/rules/`, has exactly one file per rule of the plugin.
- `pnpm build`: compiles to `dist/` and generates `dist/presets/all.json` from `src/presets/all.ts` (the rule list comes from the plugin).
- `pnpm pack:check`: checks the built preset, then the tarball `npm pack` would publish: only the files in `files`, no local absolute paths, `publint --strict`.
- `pnpm consumer-test`: installs the tarball in `scripts/consumer-fixture/` with pnpm and checks the diagnostics of Oxlint with each config form: `oxlint.config.ts` and `.oxlintrc.json` with the preset, `.oxlintrc.json` with the plugin by package name.
- `pnpm build-and-pack`: `check`, `build`, `pack:check` and `consumer-test`; run it after every change.
- `pnpm changeset-version`: `changeset version`, then `pnpm format` so the generated changelog passes `format:check`; the release workflow runs it for the version pull request.
- `pnpm changeset-publish`: `build-and-pack`, then `changeset publish`; the release workflow runs it, and it is not a supported path from a local machine.
- `pnpm changeset-status`: `changeset status --verbose`, the plan of the next release.
- `pnpm build:w`: reruns `pnpm build`, preset included, on every change to `src/` or `tsconfig.build.json`; a failed build waits for the next change.
- `pnpm consumer:link <consumer>`: after `pnpm build`, replaces the pnpm symlinks of the plugin in every workspace package of `<consumer>` with links to the checkout, so the consumer's own lint runs the checkout's rules; no tracked file of the consumer changes. `pnpm consumer:unlink <consumer>` restores them with `pnpm install --frozen-lockfile`, as does any `pnpm install` in the consumer.

A new rule must be registered in `src/index.ts`, documented in its rule file, `docs/user-guide/rules/<rule-name>.md` (see [`docs/rules-catalog-style.md`](docs/rules-catalog-style.md)), and linked from its topic in the rules index, `docs/user-guide/rules.md`; `pnpm build` adds it to the preset.

## Agent evals

Rule tests check what a rule reports; agent evals measure what agents do with the report. `pnpm eval <rule> [case]` runs Claude agents on the cases of `evals/<rule>.md` with the message of a baseline commit and with the working tree's, and writes a report of how they fixed each case. It spends API credit, so it runs on demand only, never in CI.

- **Cases**: `evals/<rule>.md` holds an optional `## preamble` section, a `ts` block of declarations shared by its cases, and one `## <case-name>` section per case: one `ts` block, a `Good:` line and a `Bad:` line. Each case is compiled after `evals/preamble.ts` and the rule's preamble. A preamble must not hint at the fix, and a case must not leave a trivial way around the pattern, such as an early return. `anti-slop-*` rules are out of scope.
- **Gate**: in each variant, every case must compile and Oxlint must report the rule under test on it and nothing else, before any agent runs.
- **Runs**: each agent runs in its own container, built from `evals/image/`, which sees only the case project at `/work` and its `node_modules`, read-only. Claude Code runs with `--bare` and a home that disappears with the container, so none of the maintainer's configuration reaches it, and gets a neutral prompt: run Oxlint, fix every problem in `src/` without `--fix`, keep `tsc` passing. A run counts only if `tsc` passes, the lint is clean and the diff changes only `src/` without silencing comments.
- **Report**: `evals/.results/<rule>/<timestamp>/report.md`, gitignored: valid and invalid runs per variant, the message the agents saw, and each diff, for a human to classify as good, bad, other (a shape outside the rubric) or escape (the agent restructured around the pattern, so the case needs fixing).
- **Variants**: the baseline is `origin/main` unless `--base <ref>` says otherwise; `--baseline-only` runs only the baseline, to see what agents do with today's message before changing it. `pnpm eval --help` lists the other options.
- **API key**: an env file with `ANTHROPIC_API_KEY=...`, by default `~/.config/oxlint-plugin-effect/eval.env`, readable only by you (`chmod 600`). Docker reads it; the script only checks that it exists. Keep it out of the repository and of your shell profile, so coding agents do not see it.
- **Without spending**: `--fake-agent <command>` runs a shell command in the case project instead of Claude, to try the pipeline.

It needs Docker, Node and pnpm, and network for the agents and the installs; the first run builds the image.

## The latest Oxlint

The plugin runs inside the user's Oxlint, and `peerDependencies` accepts any `1.x` from `1.82.0`, while the pinned devDependency stays on one version. Every Monday, and on demand, the Compatibility workflow, `.github/workflows/compatibility.yml`, installs the latest `oxlint` and `@oxlint/plugins` and runs `test`, `build` and `consumer-test`. It skips lint: the question is whether the plugin works with that version, not whether new Oxlint rules flag this repo. A failure opens and pins the issue "The latest Oxlint breaks the plugin"; while it is open, each later failure rewrites its description with the last failing version and run, without commenting.

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
