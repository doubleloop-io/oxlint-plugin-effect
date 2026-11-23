import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { loadRuleCases, selectCase } from "./cases.ts"
import { ensureImage } from "./docker.ts"
import { evaluate } from "./evaluate.ts"
import { type Judge, judgeResults } from "./judge.ts"
import { type Results, renderReport } from "./report.ts"
import type { Agent } from "./run.ts"

const usage = `Usage: pnpm eval <rule> [case] [options]
       pnpm eval --rejudge <results-dir> [judge options]

Runs agents on the cases of evals/<rule>.md and reports how they fixed them.

Options:
  --baseline-only         run only the baseline, not the working tree
  --base <ref>            the baseline commit (default: origin/main)
  --runs <n>              agents per case and variant (default: 5)
  --concurrency <n>       agents or judgments at the same time (default: 5)
  --model <model>         the agents' model (default: sonnet)
  --max-budget-usd <n>    the spending cap of each agent (default: 2)
  --timeout-minutes <n>   the time limit of each agent (default: 20)
  --key-file <path>       the env file with ANTHROPIC_API_KEY
                          (default: ~/.config/oxlint-plugin-effect/eval.env)
  --fake-agent <command>  run this shell command in the fixture instead of Claude:
                          tries the pipeline without an API key

Judge options:
  --judge <human|llm>     who classifies the valid runs (default: human)
  --judge-model <model>   the judge's model (default: opus)
  --rejudge <dir>         judge the runs of an earlier results directory again,
                          without running agents; implies --judge llm
  --fake-judge <command>  print a verdict with this shell command instead of asking
                          Claude, such as echo '{"category":"good","reason":"x"}';
                          implies --judge llm

  --help                  show this help`

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        "baseline-only": { type: "boolean", default: false },
        base: { type: "string", default: "origin/main" },
        runs: { type: "string", default: "5" },
        concurrency: { type: "string", default: "5" },
        model: { type: "string", default: "sonnet" },
        "max-budget-usd": { type: "string", default: "2" },
        "timeout-minutes": { type: "string", default: "20" },
        "key-file": {
            type: "string",
            default: join(homedir(), ".config/oxlint-plugin-effect/eval.env"),
        },
        "fake-agent": { type: "string" },
        judge: { type: "string", default: "human" },
        "judge-model": { type: "string", default: "opus" },
        rejudge: { type: "string" },
        "fake-judge": { type: "string" },
        help: { type: "boolean", default: false },
    },
})

const positiveNumber = (name: string, value: string) => {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0) throw new Error(`--${name} must be positive`)
    return number
}

// Only checks that it exists: Docker reads it, this script never does.
const checkKeyFile = async (path: string) => {
    try {
        await access(path)
    } catch {
        throw new Error(`no key file at ${path}: see CONTRIBUTING.md, "Agent evals"`)
    }
}

const writeResults = async (resultsDir: string, results: Results) => {
    await writeFile(join(resultsDir, "results.json"), `${JSON.stringify(results, null, 4)}\n`)
    const reportFile = join(resultsDir, "report.md")
    await writeFile(reportFile, renderReport(results))
    console.log(`report: ${reportFile}`)
}

const repoDir = fileURLToPath(new URL("../../", import.meta.url))
const evalsDir = join(repoDir, "evals")
const concurrency = positiveNumber("concurrency", values.concurrency)
const keyFile = values["key-file"]

if (values.judge !== "human" && values.judge !== "llm") {
    throw new Error(`--judge must be human or llm, not ${values.judge}`)
}
const usesLlmJudge =
    values.judge === "llm" || values.rejudge !== undefined || values["fake-judge"] !== undefined
const judge: Judge | undefined = !usesLlmJudge
    ? undefined
    : values["fake-judge"] === undefined
      ? { kind: "claude", model: values["judge-model"], maxBudgetUsd: 1, envFile: keyFile }
      : { kind: "fake", command: values["fake-judge"] }

const [rule, caseName, ...extra] = positionals
if (values.help || (values.rejudge === undefined && rule === undefined) || extra.length > 0) {
    console.log(usage)
    process.exit(values.help ? 0 : 1)
}

const agent: Agent =
    values["fake-agent"] === undefined
        ? {
              kind: "claude",
              model: values.model,
              maxBudgetUsd: positiveNumber("max-budget-usd", values["max-budget-usd"]),
              envFile: keyFile,
          }
        : { kind: "fake", command: values["fake-agent"] }

const runsAgents = values.rejudge === undefined
if ((runsAgents && agent.kind === "claude") || judge?.kind === "claude") {
    await checkKeyFile(keyFile)
}

try {
    if (values.rejudge !== undefined) {
        if (judge === undefined) throw new Error("--rejudge needs an LLM judge")
        const resultsDir = resolve(values.rejudge)
        const results: Results = JSON.parse(
            await readFile(join(resultsDir, "results.json"), "utf8"),
        )
        ensureImage(join(evalsDir, "image"))
        await writeResults(resultsDir, await judgeResults(results, judge, concurrency))
    } else if (rule !== undefined) {
        if (rule.startsWith("anti-slop-")) {
            throw new Error("anti-slop-* rules are out of scope: their messages come from upstream")
        }
        const ruleCases = selectCase(await loadRuleCases(evalsDir, rule), caseName)
        const resultsDir = join(
            evalsDir,
            ".results",
            rule,
            new Date().toISOString().replaceAll(":", "-"),
        )
        await mkdir(resultsDir, { recursive: true })
        console.log(`results: ${resultsDir}`)
        ensureImage(join(evalsDir, "image"))
        const results = await evaluate({
            repoDir,
            evalsDir,
            resultsDir,
            ruleCases,
            baseRef: values.base,
            baselineOnly: values["baseline-only"],
            runs: positiveNumber("runs", values.runs),
            concurrency,
            timeoutMs: positiveNumber("timeout-minutes", values["timeout-minutes"]) * 60 * 1000,
            agent,
        })
        // Saved before judging, so a failed judgment does not lose the runs.
        await writeResults(resultsDir, results)
        if (judge !== undefined) {
            await writeResults(resultsDir, await judgeResults(results, judge, concurrency))
        }
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
}
