# How to write `RULES.md`

Writing rules for the rule catalog. They apply to every new or modified section.

## Reader

A developer who:

- has just received a report and wants to understand in under a minute what is wrong, why, and what the right form looks like;
- or is deciding whether to enable the rule and wants to know what it sees and what it misses.

Not the plugin maintainer: the rule's history, the sources it came from and implementation details are of no use to this reader.

## Template

````md
### `rule-name`

<sup>[↑ rules index](#rules-index)</sup>

**Intent**: one sentence, in the imperative or as a prohibition.

```ts
// no
code the rule reports

// yes
the compliant form
```

**Trigger**: what exactly the rule reports.

**Exemptions and blind spots**: what it skips on purpose, and what it cannot see.

**Why**: one or two sentences.

**Options**:

- `optionName`: default `…`. What changing it does.

**Fix**: none
````

The heading and the back link below it are enforced by `rules-md.test.ts`.

## Opening sections

- **Rules index**: a `Group | Rule` table in section order. The group appears only on its first row, linked to its section; every rule links to its own.
- **Shared settings**: one bullet per setting, with two sub-bullets: `used by`, listing the rules (a short note when a rule uses the setting differently from the others; rules that use it the same way share one bullet), and `default`, with the reason for any deliberate exclusion.

## Fields

- **Intent**: one sentence that makes sense on its own. It states the norm, not the mechanism ("domain code does not import the implementation", not "reports relative imports of directories…").
- **Example**: `no` first, then `yes`. The `no` is code that **this** rule reports: never an example of the pattern the rule does not detect. The minimum needed to recognize the case, at most about fifteen lines. Several `yes` only when they are genuinely different alternatives.
- **Trigger**: the reported syntactic forms, precise enough to predict whether a given piece of code fires.
- **Exemptions and blind spots**: deliberate exemptions (entry, test, release) with their reason in half a sentence; then the cases that slip through (aliases, mutual recursion, requirements that need types). The reader must know that the rule's silence does not mean compliance. If another rule or diagnostic covers the gap, one line: "See `leaking-requirements` (effecttsgo)." Omit the field when there is nothing to say.
- **Why**: the concrete cost of breaking the norm. One or two sentences.
- **Options**: a bold label like Intent, not a heading. One bullet per option: a shared setting reads "shared setting, see [Shared settings](../RULES.md#shared-settings).", one specific to the rule states its default. A rule without options has `**Options**: none` on one line.
- **Fix**: `none`, `autofix` or `suggestion`; the conditions under which the fix does not apply go in Exemptions and blind spots.

## Redundancy and verbosity

- **Every fact in one place.** What applies to several rules (common limits, the `entryFiles`, `testFiles` and `discriminants` settings) lives in the opening sections and rules link to it.
- **Sibling rules** (same pattern): the second has Intent, Trigger, Exemptions, Options and Fix, and links to the first for the example and Why instead of repeating them.
- **No source citations** (`AGENTS.md`, JSDoc, `ai-docs/`), no rule history, no numeric comparisons with effecttsgo: they do not belong in the catalog.
- **No pattern guides.** How to structure tests without `@effect/vitest`, how to write a test runner: those are patterns, not rules, and do not belong in the catalog.
- **No repetition across fields.** If Why repeats the Intent, drop Why; if the Trigger repeats the example, shorten the Trigger.
- **Size**: if a section exceeds about thirty lines, the rule is probably too broad or the text explains things that do not belong to it.
