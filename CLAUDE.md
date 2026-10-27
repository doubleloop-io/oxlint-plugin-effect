# oxlint-plugin-effect

After any change, run `pnpm format && pnpm build-and-pack` and fix what it reports before finishing. Run it outside the sandbox: `npm pack` writes to `~/.npm`. Formatting is never a question for the user.

Do not modify the logic or messages of `rules/anti-slop-*`: they are absorbed from `dmmulroy/anti-slop` and must stay resyncable. When a dl-effect rule covers the same case more strongly, retire the anti-slop rule instead.

When adding or editing a section of `RULES.md`, follow [`docs/rules-catalog-style.md`](docs/rules-catalog-style.md).

The website (`website/`) parses `RULES.md` in its content module (`website/src/site-content/`) and fails its build when a rule section breaks the catalog template: a change to the template or to the structure of `RULES.md` must update the content module and its tests (`cd website && pnpm test`).

## Agent skills

### Issue tracker

Issues live in GitHub Issues of `doubleloop-io/oxlint-plugin-effect`, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
