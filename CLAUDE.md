# oxlint-plugin-effect

After any change, run `pnpm format && pnpm build-and-pack` and fix what it reports before finishing. Run it outside the sandbox: `npm pack` writes to `~/.npm`. Formatting is never a question for the user.

Do not modify the logic or messages of `rules/anti-slop-*`: they are absorbed from `dmmulroy/anti-slop` and must stay resyncable. When a dl-effect rule covers the same case more strongly, retire the anti-slop rule instead.

The rule catalog is one file per rule, `user-guide/rules/<rule-name>.md`, listed in the rules index, `user-guide/rules.md`. When adding or editing a rule file, follow [`docs/rules-catalog-style.md`](docs/rules-catalog-style.md).

The website (`website/`) is built from `user-guide/` by its content module (`website/src/site-content/`). Each `user-guide/` file is a page, titled and ordered by its frontmatter; `user-guide/README.md` is the guide index and the landing page, `user-guide/rules.md` the Rules overview, whose links order the rule pages; each rule file is a rule page in the group of its frontmatter. Links between guide files are relative `.md` paths. The build fails when a guide file's frontmatter is invalid, a rule file breaks the catalog template or is missing from the rules index, or a link resolves to no page: a change to the template, to the frontmatter or to the structure of the rules index must update the content module and its tests (`cd website && pnpm test`).

The README is the essential guide: introduction, installation, the happy path and the warnings that matter before adopting the plugin. It links to the website guide with absolute URLs and does not repeat it; anything else goes in `user-guide/`. Maintainer docs go in `CONTRIBUTING.md`, which has no site page.

## Agent skills

### Issue tracker

Issues live in GitHub Issues of `doubleloop-io/oxlint-plugin-effect`, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
