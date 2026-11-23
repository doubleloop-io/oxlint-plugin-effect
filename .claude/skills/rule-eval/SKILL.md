---
name: rule-eval
description: Measure how agents fix the report of a dl-effect rule. Adds a case to evals/<rule>.md and runs `pnpm eval` with the LLM judge, baseline vs working tree, then summarizes the report. Use when asked to test or eval a case for a rule, to see what agents do with a rule's message, or to compare a reworded message against the current one.
---

# Rule eval

`pnpm eval` runs Claude agents on the cases of `evals/<rule>.md` in containers and reports how they fixed each one. `CONTRIBUTING.md`, section "Agent evals", describes the tool; read it first.

## 1. Write the case

- **Rule**: a file in `src/rules/`. `anti-slop-*` rules are out of scope.
- **Section**: add `## <case-name>` (kebab-case) to `evals/<rule>.md`, creating the file if needed, with exactly one `ts` block, then a `Good:` line and a `Bad:` line.
- **Case name**: the situation that sets this case apart from the rule's other cases, such as `conditional-branch` for a `yield*` inside a branch. Not the rule restated nor the fix: every case of `no-effect-promise` lifts a rejecting promise.
- **Good and Bad** come from whoever asks for the case: what a right fix and a wrong fix look like. When they are not given, ask; do not invent them from the rule's doc.
- **The code must face the pattern**: no trivial way around it, such as an early return, a value that can be inlined or a branch that can be deleted. Otherwise agents escape and the round measures nothing.
- **Incidental declarations**: `evals/preamble.ts` already imports the common `effect` modules. Types shared by the rule's cases go in its `## preamble` section; anything only one case needs is a `declare const` in the case. Neither may hint at the fix, such as a ready-made helper when the case measures whether the agent extracts one.

## 2. Check the case for free

```sh
pnpm eval <rule> <case> --baseline-only --runs 1 --fake-agent true
```

It builds the case and runs the gate: the case must compile and report the rule, and nothing else. A gate failure lists its problems; fix the case and repeat. The fake run itself shows as invalid, which is expected. Run `pnpm eval` outside the sandbox: it needs Docker, `~/.npm` and the network.

## 3. Run the eval

- **Variants**: when the rule's message differs from `origin/main` (`git diff origin/main -- src/rules/<rule>.ts`), run the A/B; otherwise add `--baseline-only`, since both variants would be the same.
- **Command**: `pnpm eval <rule> <case> --judge llm`, plus `--base <ref>` when the baseline is not `origin/main`.
- **Cost**: it spends API credit, about $0.05 per agent run and under $0.01 per judgment, so about $0.50 for an A/B of 5 runs per variant. State the estimate and get the go-ahead before running; the person may prefer to run it themselves with `! pnpm eval …`.
- **The key**: never read, print or copy the key file (`~/.config/oxlint-plugin-effect/eval.env` by default). Docker reads it.

## 4. Read the report

The last line of the output gives `evals/.results/<rule>/<timestamp>/report.md`. Never delete anything in `evals/.results/`: earlier results may still be needed.

- **Read every `other` and `escape` diff**, and spot-check `good` and `bad`: the judge can be wrong, and its reason can contradict its category.
- **Invalid runs**: their reasons are in the report; many of them mean the case or the message needs a look, not the agents.
- **Summarize**: the counts per variant, the shapes the agents produced (with a short excerpt of a typical diff), and what to do next:
  - an `other` shape that is right or wrong for good: add it to `Good:` or `Bad:`, then `pnpm eval --rejudge <results-dir> --judge llm`, which judges again without running agents;
  - an `escape`: rewrite the case so the pattern cannot be avoided;
  - a message that still leads to `bad`: reword the message in `src/rules/<rule>.ts` and run the A/B.

When a message change comes out of this, its pull request carries the summary table of the report in its body.
