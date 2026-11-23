import type { Diagnostic } from "../oxlint-diagnostics.ts"
import type { EvalCase } from "./cases.ts"
import { type Category, type Verdict, categories } from "./judge.ts"
import type { RunOutcome } from "./run.ts"

export type RunRecord = RunOutcome & {
    // Relative to the results directory.
    readonly dir: string
    readonly verdict?: Verdict | undefined
}

export type CaseResults = {
    readonly name: string
    // The case project's `src/case.ts`.
    readonly source: string
    // What the gate reported: the message the agents saw.
    readonly reported: readonly Diagnostic[]
    readonly runs: readonly RunRecord[]
}

export type VariantResults = {
    readonly name: string
    readonly label: string
    readonly cases: readonly CaseResults[]
}

// Everything the report shows, saved as results.json so it can be judged again.
export type Results = {
    readonly rule: string
    readonly startedAt: string
    readonly agent: string
    readonly judge?: string
    readonly cases: readonly EvalCase[]
    readonly variants: readonly VariantResults[]
}

const usd = (value: number) => `$${value.toFixed(2)}`

const sum = (values: readonly (number | undefined)[]) =>
    values.reduce<number>((total, value) => total + (value ?? 0), 0)

const isJudged = (results: Results) => results.judge !== undefined

const categoryOf = (run: RunRecord) =>
    run.verdict !== undefined && "category" in run.verdict ? run.verdict.category : undefined

const countRow = (runs: readonly RunRecord[], judged: boolean) => {
    const valid = runs.filter((run) => run.valid)
    const invalid = runs.length - valid.length
    const agentCost = usd(sum(runs.map((run) => run.agent.costUsd)))
    if (!judged) return [valid.length, invalid, agentCost]
    const count = (category: Category | undefined) =>
        valid.filter((run) => categoryOf(run) === category).length
    const unjudged = count(undefined)
    return [
        ...categories.map(count),
        unjudged,
        invalid,
        agentCost,
        usd(sum(runs.map((run) => run.verdict?.costUsd))),
    ]
}

const summaryTable = (results: Results) => {
    const judged = isJudged(results)
    const header = judged
        ? ["Case", "Variant", ...categories, "unjudged", "invalid", "Agents", "Judge"]
        : ["Case", "Variant", "Valid", "Invalid", "Cost"]
    return [
        `| ${header.join(" | ")} |`,
        `|${header.map(() => "---").join("|")}|`,
        ...results.cases.flatMap(({ name }) =>
            results.variants.map((variant) => {
                const runs = variant.cases.find((c) => c.name === name)?.runs ?? []
                return `| ${[name, variant.name, ...countRow(runs, judged)].join(" | ")} |`
            }),
        ),
    ]
}

const verdictText = (verdict: Verdict | undefined) => {
    if (verdict === undefined) return []
    if ("error" in verdict) return [`**not judged**: ${verdict.error}`]
    return [`**${verdict.category}**: ${verdict.reason}`]
}

const runSection = (run: RunRecord, index: number) => {
    const facts = [
        run.valid ? "valid" : `**invalid**: ${run.reasons.join("; ")}`,
        ...(run.agent.turns === undefined ? [] : [`${run.agent.turns} turns`]),
        ...(run.agent.costUsd === undefined ? [] : [usd(run.agent.costUsd)]),
    ]
    return [
        `#### Run ${index + 1}: ${facts.join(", ")}`,
        "",
        `\`${run.dir}\``,
        "",
        ...verdictText(run.verdict).flatMap((text) => [text, ""]),
        // Four backticks, so a diff that holds a fence does not end the block.
        ...(run.diff === "" ? ["No change."] : ["````diff", run.diff.trimEnd(), "````"]),
        "",
    ]
}

const caseSection = (evalCase: EvalCase, variants: readonly VariantResults[]) => [
    `## ${evalCase.name}`,
    "",
    `- **Good:** ${evalCase.good}`,
    `- **Bad:** ${evalCase.bad}`,
    "",
    ...variants.flatMap((variant) => {
        const results = variant.cases.find((c) => c.name === evalCase.name)
        return [
            `### ${variant.name}`,
            "",
            "Reported to the agents:",
            "",
            ...(results?.reported ?? []).map(({ line, message }) => `> line ${line}: ${message}`),
            "",
            ...(results?.runs ?? []).flatMap(runSection),
        ]
    }),
]

const guidance = (results: Results) =>
    isJudged(results)
        ? "Read every other and escape, and spot-check the rest: the judge can be wrong."
        : "Classify each valid diff against Good and Bad: good, bad, other (a shape neither " +
          "describes) or escape (the agent restructured around the pattern, so the case needs " +
          "fixing)."

export const renderReport = (results: Results) =>
    `${[
        `# Eval of ${results.rule}`,
        "",
        `- Started: ${results.startedAt}`,
        `- Agent: ${results.agent}`,
        `- Judge: ${results.judge ?? "human"}`,
        ...results.variants.map((variant) => `- ${variant.name}: ${variant.label}`),
        "",
        ...summaryTable(results),
        "",
        guidance(results),
        "",
        ...results.cases.flatMap((evalCase) => caseSection(evalCase, results.variants)),
    ].join("\n")}\n`
