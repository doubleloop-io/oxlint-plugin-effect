import type { Diagnostic } from "../oxlint-diagnostics.ts"
import type { EvalCase } from "./cases.ts"
import type { RunOutcome } from "./run.ts"

export type VariantReport = {
    readonly name: string
    readonly label: string
    // The reports of the gate, per case: the message the agents saw.
    readonly gate: ReadonlyMap<string, readonly Diagnostic[]>
    // The runs, per case, in order.
    readonly runs: ReadonlyMap<string, readonly RunOutcome[]>
}

export type Report = {
    readonly rule: string
    readonly startedAt: string
    readonly agent: string
    readonly cases: readonly EvalCase[]
    readonly variants: readonly VariantReport[]
}

const usd = (value: number) => `$${value.toFixed(2)}`

const costOf = (runs: readonly RunOutcome[]) =>
    runs.reduce((total, run) => total + (run.agent.costUsd ?? 0), 0)

const summaryTable = ({ cases, variants }: Report) => [
    "| Case | Variant | Valid | Invalid | Cost |",
    "|---|---|---|---|---|",
    ...cases.flatMap(({ name }) =>
        variants.map((variant) => {
            const runs = variant.runs.get(name) ?? []
            const valid = runs.filter((run) => run.valid).length
            return `| ${name} | ${variant.name} | ${valid} | ${runs.length - valid} | ${usd(costOf(runs))} |`
        }),
    ),
]

const runSection = (run: RunOutcome, index: number) => {
    const facts = [
        run.valid ? "valid" : `**invalid**: ${run.reasons.join("; ")}`,
        ...(run.agent.turns === undefined ? [] : [`${run.agent.turns} turns`]),
        ...(run.agent.costUsd === undefined ? [] : [usd(run.agent.costUsd)]),
    ]
    return [
        `#### Run ${index + 1}: ${facts.join(", ")}`,
        "",
        // Four backticks, so a diff that holds a fence does not end the block.
        ...(run.diff === "" ? ["No change."] : ["````diff", run.diff.trimEnd(), "````"]),
        "",
    ]
}

const caseSection = (evalCase: EvalCase, variants: readonly VariantReport[]) => [
    `## ${evalCase.name}`,
    "",
    `- **Good:** ${evalCase.good}`,
    `- **Bad:** ${evalCase.bad}`,
    "",
    ...variants.flatMap((variant) => [
        `### ${variant.name}`,
        "",
        "Reported to the agents:",
        "",
        ...(variant.gate.get(evalCase.name) ?? []).map(
            ({ line, message }) => `> line ${line}: ${message}`,
        ),
        "",
        ...(variant.runs.get(evalCase.name) ?? []).flatMap(runSection),
    ]),
]

// For a human to classify each valid diff as good, bad, other or escape against the rubric.
export const renderReport = (report: Report) =>
    `${[
        `# Eval of ${report.rule}`,
        "",
        `- Started: ${report.startedAt}`,
        `- Agent: ${report.agent}`,
        ...report.variants.map((variant) => `- ${variant.name}: ${variant.label}`),
        "",
        ...summaryTable(report),
        "",
        ...report.cases.flatMap((evalCase) => caseSection(evalCase, report.variants)),
    ].join("\n")}\n`
