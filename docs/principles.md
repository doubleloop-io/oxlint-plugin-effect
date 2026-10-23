# Library principles

The criteria by which a rule enters, changes or leaves `dl-effect`. They apply to every new or modified rule and to every candidate pattern. Written on 2026-10-15.

## Small core, very few false positives

A rule that reports correct code teaches people to ignore reports, including those of the other rules. A missed case is better than a false positive.

- A rule enters only if its expected false positives are rare and recognizable from syntax, so the rule itself can exempt them.
- Doubt about usefulness is enough to leave a pattern out: one that helps "sometimes" does not become a rule until new evidence shows it helps consistently.
- A name heuristic (`token`, `type`, …) enters only with a narrow or empty default, which consumers who want it can widen through an option.
- Exemptions belong in the rule, not in the consumer's disable comments: if a legitimate case needs an `oxlint-disable`, the rule must be narrowed.
- Severity comes from measurement on a real codebase: a rule stays at `warn` until it produces zero noise.

## Syntax only

No rule uses type information. What can only be seen through types stays with effecttsgo, or is a pattern for human judgment.

## No overlap with effecttsgo

A pattern already reported by `@effect/tsgo` does not become a rule. If effecttsgo covers it partially, the rule covers the rest, and its section in [`RULES.md`](../RULES.md) states where the boundary lies.

## Effect 4

Rules are written and tested against Effect 4. Where a v3 API has the same intent, a rule recognizes its v3 name too, with a test.

## Anti-slop unchanged

`anti-slop-*` rules are not modified, so they stay resyncable with `dmmulroy/anti-slop`. When a dl-effect rule covers the same case more strongly, the anti-slop rule is retired.

## Local style as an option

When two forms are both correct and the choice belongs to a codebase, the difference becomes a rule option (precedents: `entryFiles`, `transportTypes`), not a rule that forbids one of them.
