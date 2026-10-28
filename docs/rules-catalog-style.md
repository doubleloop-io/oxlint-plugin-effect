# How to write the rule catalog

Writing rules for the rule catalog: one file per rule, `docs/user-guide/rules/<rule-name>.md`, listed in the rules index, `docs/user-guide/rules.md`. They apply to every new or modified rule file.

## Reader

A developer who:

- has just received a report and wants to understand in under a minute what is wrong, why, and what the right form looks like;
- or is deciding whether to enable the rule and wants to know what it sees and what it misses.

Not the plugin maintainer: the rule's history, the sources it came from and implementation details are of no use to this reader.

## Template

````md
---
title: rule-name
group: Error channel
---

**Intent**: one sentence, in the imperative or as a prohibition.

```ts
// ❌ no
code the rule reports

// ✅ yes
the compliant form
```

**Trigger**: what exactly the rule reports.

**Exemptions and blind spots**: what it skips on purpose, and what it cannot see.

**Why**: one or two sentences.

**Options**:

- `optionName`: default `…`. What changing it does.

**Fix**: none
````

The file name is the rule name; `src/rule-files.test.ts` checks that the catalog has exactly one file per rule of the plugin. `title` is the rule name and `group` the topic of its row in the rules index. The file has no heading: the website shows the title.

The website parses this template in `website/src/site-content/`: it gives each rule file a page in the group of its frontmatter, in the order of the rules index, rewrites every relative `.md` link to the page it names, and fails the build naming the file when the rules index does not link it, when a link has no page, or when Intent, Trigger, Options or Fix is missing or out of shape (Options neither `none` nor a list, Fix not `none`, `autofix` or `suggestion…`, an example not opening with `// ❌ no` or without `// ✅ yes`). A change to the template must update that module and its tests.

## Rules index

`docs/user-guide/rules.md` has a `Topic | Rules` table: one row per group, its rules linked to their files in the order of the website sidebar. A new rule is added to the row of its group. Under Absorbed from anti-slop, the rules imported from `dmmulroy/anti-slop` and the anti-slop rules superseded by a dl-effect rule.

## Shared settings page

`docs/user-guide/shared-settings.md` is the only place that describes the settings. Under The settings, one bullet per setting, saying what it is for, with two sub-bullets: `used by`, listing the rules (a short note when a rule uses the setting differently from the others; rules that use it the same way share one bullet), and `default`, with the reason for any deliberate exclusion. A rule that gains or drops a setting updates its `used by`.

## Fields

- **Intent**: one sentence that makes sense on its own. It states the norm, not the mechanism ("domain code does not import the implementation", not "reports relative imports of directories…").
- **Example**: `// ❌ no` first, then `// ✅ yes`, each marker on its own comment line with its emoji. The `no` is code that **this** rule reports: never an example of the pattern the rule does not detect. The minimum needed to recognize the case, at most about fifteen lines. Several `yes` only when they are genuinely different alternatives.
- **Trigger**: the reported syntactic forms, precise enough to predict whether a given piece of code fires.
- **Exemptions and blind spots**: deliberate exemptions (entry, test, release) with their reason in half a sentence; then the cases that slip through (aliases, mutual recursion, requirements that need types). The reader must know that the rule's silence does not mean compliance. If another rule or diagnostic covers the gap, one line: "See `leaking-requirements` (effecttsgo)." Omit the field when there is nothing to say.
- **Why**: the concrete cost of breaking the norm. One or two sentences.
- **Options**: a bold label like Intent, not a heading. One bullet per option: a shared setting reads "shared setting, see [Shared settings](../shared-settings.md).", one specific to the rule states its default. A rule without options has `**Options**: none` on one line.
- **Fix**: `none`, `autofix` or `suggestion`; the conditions under which the fix does not apply go in Exemptions and blind spots.
- **Origin**: only on the rules absorbed from anti-slop, after Fix: "absorbed from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), MIT-licensed: see [`LICENSE.anti-slop`](../../../LICENSE.anti-slop)."

## Redundancy and verbosity

- **Every fact in one place.** What applies to several rules (common limits, the `entryFiles`, `testFiles` and `discriminants` settings) lives in the guide pages [Common limits](user-guide/common-limits.md) and [Shared settings](user-guide/shared-settings.md), and rules link to them.
- **Sibling rules** (same pattern): the second has Intent, Trigger, Exemptions, Options and Fix, and links to the first for the example and Why instead of repeating them.
- **No source citations** (`AGENTS.md`, JSDoc, `ai-docs/`), no rule history, no numeric comparisons with effecttsgo: they do not belong in the catalog.
- **No pattern guides.** How to structure tests without `@effect/vitest`, how to write a test runner: those are patterns, not rules, and do not belong in the catalog.
- **No repetition across fields.** If Why repeats the Intent, drop Why; if the Trigger repeats the example, shorten the Trigger.
- **Size**: if a section exceeds about thirty lines, the rule is probably too broad or the text explains things that do not belong to it.
