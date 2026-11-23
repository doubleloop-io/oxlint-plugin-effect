import type { Diagnostic } from "../oxlint-diagnostics.ts"
import type { EvalCase } from "./cases.ts"
import { costOf, field, isolatedClaude } from "./claude.ts"
import { claudeVersion, runContainer } from "./docker.ts"
import { runPool } from "./pool.ts"
import type { Results, RunRecord } from "./report.ts"

export const categories = ["good", "bad", "other", "escape"] as const

export type Category = (typeof categories)[number]

export type Verdict =
    | { readonly category: Category; readonly reason: string; readonly costUsd?: number }
    | { readonly error: string; readonly costUsd?: number }

export type Judge =
    | {
          readonly kind: "claude"
          readonly model: string
          readonly maxBudgetUsd: number
          readonly envFile: string
      }
    // A shell command whose output is the verdict, to try the pipeline without spending.
    | { readonly kind: "fake"; readonly command: string }

export type JudgeInput = {
    readonly rule: string
    readonly evalCase: EvalCase
    readonly source: string
    readonly reported: readonly Diagnostic[]
    readonly diff: string
}

export const firstLine = (text: string) => (text.includes("\n") ? `${text.split("\n")[0]} …` : text)

const fenced = (lang: string, text: string) => `\`\`\`\`${lang}\n${text.trimEnd()}\n\`\`\`\``

export const judgePrompt = ({ rule, evalCase, source, reported, diff }: JudgeInput) =>
    [
        "You review how a coding agent fixed a lint report in TypeScript code that uses Effect.",
        "",
        `The rule \`${rule}\` reported this on the original code:`,
        "",
        ...reported.map(({ line, message }) => `> line ${line}: ${message}`),
        "",
        "The original code, `src/case.ts`:",
        "",
        fenced("ts", source),
        "",
        "The agent's change:",
        "",
        fenced("diff", diff),
        "",
        "The case author describes the fixes this case looks for:",
        "",
        `- Good: ${evalCase.good}`,
        `- Bad: ${evalCase.bad}`,
        "",
        "Put the change in exactly one category:",
        "",
        "- good: the change has the shape the Good line describes.",
        "- bad: the change has a shape the Bad line describes.",
        "- other: a fix that neither line describes.",
        "- escape: the reported pattern disappeared because the agent restructured the code " +
            "around it, for example with an early return or by removing or moving the code " +
            "that made the case hard, so the case did not test how the agent follows the message.",
        "",
        "Judge the shape of the fix, not its style or naming. Answer with only a JSON object, " +
            'no code fence: {"category": "good" | "bad" | "other" | "escape", ' +
            '"reason": "<one sentence>"}. For other, the reason names the shape of the fix.',
    ].join("\n")

const isCategory = (value: unknown): value is Category =>
    categories.some((category) => category === value)

// The JSON object in a text, tolerating a code fence or words around it.
const objectIn = (text: string): unknown => {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start === -1 || end < start) return undefined
    try {
        return JSON.parse(text.slice(start, end + 1))
    } catch {
        return undefined
    }
}

// Claude's `--output-format json` wraps the answer in a result; a fake judge prints it bare.
export const parseVerdict = (stdout: string): Verdict => {
    const output = objectIn(stdout)
    const result = field(output, "result")
    const costUsd = costOf(output)
    const answer = typeof result === "string" ? objectIn(result) : output
    const category = field(answer, "category")
    const reason = field(answer, "reason")
    if (isCategory(category) && typeof reason === "string") {
        return { category, reason, ...(costUsd === undefined ? {} : { costUsd }) }
    }
    return {
        error: `no verdict in the judge's answer: ${stdout.slice(0, 500)}`,
        ...(costUsd === undefined ? {} : { costUsd }),
    }
}

const judgeCommand = (judge: Judge, input: JudgeInput) =>
    judge.kind === "fake"
        ? ["sh", "-c", judge.command]
        : isolatedClaude({
              prompt: judgePrompt(input),
              model: judge.model,
              maxBudgetUsd: judge.maxBudgetUsd,
              // It reads the prompt and answers: no tool to run.
              extra: ["--tools", "", "--output-format", "json"],
          })

const timeoutMs = 10 * 60 * 1000

// One judgment, in a container that mounts nothing.
export const judgeRun = async (judge: Judge, input: JudgeInput): Promise<Verdict> => {
    const container = await runContainer({
        command: judgeCommand(judge, input),
        network: judge.kind === "claude",
        ...(judge.kind === "claude" ? { envFile: judge.envFile } : {}),
        timeoutMs,
    })
    if (container.timedOut)
        return { error: `the judge timed out after ${timeoutMs / 60000} minutes` }
    if (container.exitCode !== 0) {
        return { error: `the judge exited with ${container.exitCode}: ${container.stderr.trim()}` }
    }
    return parseVerdict(container.stdout)
}

// Judges every valid run of the results, replacing earlier verdicts; invalid runs stay unjudged.
export const judgeResults = async (
    results: Results,
    judge: Judge,
    concurrency: number,
): Promise<Results> => {
    const jobs = results.variants.flatMap((variant) =>
        variant.cases.flatMap((caseResults) =>
            caseResults.runs.filter((run) => run.valid).map((run) => ({ caseResults, run })),
        ),
    )
    const verdicts = new Map<RunRecord, Verdict>()
    await runPool(jobs, concurrency, async ({ caseResults, run }) => {
        const evalCase = results.cases.find(({ name }) => name === caseResults.name)
        if (evalCase === undefined) throw new Error(`no case ${caseResults.name} in the results`)
        const verdict = await judgeRun(judge, {
            rule: results.rule,
            evalCase,
            source: caseResults.source,
            reported: caseResults.reported,
            diff: run.diff,
        })
        verdicts.set(run, verdict)
        console.log(`${run.dir}: ${"error" in verdict ? verdict.error : verdict.category}`)
    })
    return {
        ...results,
        judge:
            judge.kind === "claude"
                ? `Claude Code ${claudeVersion}, model ${judge.model}`
                : `fake, \`${firstLine(judge.command)}\``,
        variants: results.variants.map((variant) => ({
            ...variant,
            cases: variant.cases.map((caseResults) => ({
                ...caseResults,
                runs: caseResults.runs.map((run) => ({ ...run, verdict: verdicts.get(run) })),
            })),
        })),
    }
}
