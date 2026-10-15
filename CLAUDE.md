# oxlint-plugin-effect

After any change, run `pnpm format && pnpm build-and-pack` and fix what it reports before finishing. Run it outside the sandbox: `npm pack` writes to `~/.npm`. Formatting is never a question for the user.

Do not modify the logic or messages of `rules/anti-slop-*`: they are absorbed from `dmmulroy/anti-slop` and must stay resyncable. When a dl-effect rule covers the same case more strongly, retire the anti-slop rule instead.

When adding or editing a section of `RULES.md`, follow [`docs/rules-catalog-style.md`](docs/rules-catalog-style.md).
