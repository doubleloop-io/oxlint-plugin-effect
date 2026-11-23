import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import type { Diagnostic } from "../oxlint-diagnostics.ts"
import { loadRuleCases, selectCase } from "./cases.ts"
import { gateProblems, runChecks } from "./checks.ts"
import { claudeVersion, ensureImage } from "./docker.ts"
import { caseSource, installVariant, writeCaseProject } from "./fixture.ts"
import { type Packed, packRef, packWorkingTree } from "./pack.ts"
import { type VariantReport, renderReport } from "./report.ts"
import { type Agent, type RunOutcome, executeRun } from "./run.ts"

const usage = `Usage: pnpm eval <rule> [case] [options]

Runs agents on the cases of evals/<rule>.md and reports how they fixed them.

Options:
  --baseline-only         run only the baseline, not the working tree
  --base <ref>            the baseline commit (default: origin/main)
  --runs <n>              agents per case and variant (default: 5)
  --concurrency <n>       agents at the same time (default: 5)
  --model <model>         the agents' model (default: sonnet)
  --max-budget-usd <n>    the spending cap of each agent (default: 2)
  --timeout-minutes <n>   the time limit of each agent (default: 20)
  --key-file <path>       the env file with ANTHROPIC_API_KEY
                          (default: ~/.config/oxlint-plugin-effect/eval.env)
  --fake-agent <command>  run this shell command in the fixture instead of Claude:
                          tries the pipeline without an API key
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
        help: { type: "boolean", default: false },
    },
})

const positiveNumber = (name: string, value: string) => {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0) throw new Error(`--${name} must be positive`)
    return number
}

const [rule, caseName, ...extra] = positionals
if (values.help || rule === undefined || extra.length > 0) {
    console.log(usage)
    process.exit(values.help ? 0 : 1)
}
if (rule.startsWith("anti-slop-")) {
    throw new Error("anti-slop-* rules are out of scope: their messages come from upstream")
}

const repoDir = fileURLToPath(new URL("../../", import.meta.url))
const evalsDir = join(repoDir, "evals")
const runs = positiveNumber("runs", values.runs)
const concurrency = positiveNumber("concurrency", values.concurrency)
const timeoutMs = positiveNumber("timeout-minutes", values["timeout-minutes"]) * 60 * 1000

const agent: Agent =
    values["fake-agent"] === undefined
        ? {
              kind: "claude",
              model: values.model,
              maxBudgetUsd: positiveNumber("max-budget-usd", values["max-budget-usd"]),
              envFile: values["key-file"],
          }
        : { kind: "fake", command: values["fake-agent"] }

// Only checks that it exists: Docker reads it, this script never does.
if (agent.kind === "claude") {
    try {
        await access(agent.envFile)
    } catch {
        throw new Error(`no key file at ${agent.envFile}: see CONTRIBUTING.md, "Agent evals"`)
    }
}

const ruleCases = selectCase(await loadRuleCases(evalsDir, rule), caseName)
const globalPreamble = await readFile(join(evalsDir, "preamble.ts"), "utf8")
const startedAt = new Date().toISOString()
const resultsDir = join(evalsDir, ".results", rule, startedAt.replaceAll(":", "-"))
await mkdir(resultsDir, { recursive: true })
console.log(`results: ${resultsDir}`)

ensureImage(join(evalsDir, "image"))

type Variant = { readonly name: string; readonly packed: Packed; readonly dir: string }

const variantDir = (name: string) => join(resultsDir, name)
const variants: Variant[] = []
if (!values["baseline-only"]) {
    const dir = variantDir("working-tree")
    await mkdir(dir, { recursive: true })
    variants.push({ name: "working-tree", packed: packWorkingTree(repoDir, dir), dir })
}
{
    const dir = variantDir("baseline")
    variants.unshift({ name: "baseline", packed: await packRef(repoDir, values.base, dir), dir })
}

const installDir = (variant: Variant) => join(variant.dir, "install")
const nodeModulesDir = (variant: Variant) => join(installDir(variant), "node_modules")
const pristineDir = (variant: Variant, name: string) => join(variant.dir, name, "pristine")

// Gate: every case of every variant compiles and reports the rule, before any agent runs.
const gates = new Map<string, Map<string, readonly Diagnostic[]>>()
const problems: string[] = []
for (const variant of variants) {
    await installVariant({
        templateDir: join(evalsDir, "template"),
        tarball: variant.packed.tarball,
        rule,
        installDir: installDir(variant),
    })
    const gate = new Map<string, readonly Diagnostic[]>()
    for (const evalCase of ruleCases.cases) {
        const source = caseSource(globalPreamble, ruleCases, evalCase)
        await writeCaseProject(installDir(variant), pristineDir(variant, evalCase.name), source)
        const checks = await runChecks(pristineDir(variant, evalCase.name), nodeModulesDir(variant))
        gate.set(evalCase.name, checks.diagnostics)
        for (const problem of gateProblems(rule, checks)) {
            problems.push(`${variant.name} / ${evalCase.name}: ${problem}`)
        }
    }
    gates.set(variant.name, gate)
}
if (problems.length > 0) {
    console.error(`gate failed, no agent ran:\n${problems.map((p) => `- ${p}`).join("\n")}`)
    process.exit(1)
}

type Task = { readonly variant: Variant; readonly caseName: string; readonly index: number }

const tasks: Task[] = variants.flatMap((variant) =>
    ruleCases.cases.flatMap(({ name }) =>
        Array.from({ length: runs }, (_, index) => ({ variant, caseName: name, index })),
    ),
)

const outcomes = new Map<Task, RunOutcome>()
let next = 0
const worker = async () => {
    for (let task = tasks[next++]; task !== undefined; task = tasks[next++]) {
        const label = `${task.variant.name} / ${task.caseName} / run ${task.index + 1}`
        console.log(`${label}: started`)
        const outcome = await executeRun({
            agent,
            pristineDir: pristineDir(task.variant, task.caseName),
            nodeModulesDir: nodeModulesDir(task.variant),
            runDir: join(task.variant.dir, task.caseName, `run-${task.index + 1}`),
            timeoutMs,
        })
        outcomes.set(task, outcome)
        console.log(`${label}: ${outcome.valid ? "valid" : outcome.reasons.join("; ")}`)
    }
}
await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))

const reports: VariantReport[] = variants.map((variant) => ({
    name: variant.name,
    label: variant.packed.label,
    gate: gates.get(variant.name) ?? new Map(),
    runs: new Map(
        ruleCases.cases.map(({ name }) => [
            name,
            tasks
                .filter((task) => task.variant === variant && task.caseName === name)
                .flatMap((task) => outcomes.get(task) ?? []),
        ]),
    ),
}))
const reportFile = join(resultsDir, "report.md")
await writeFile(
    reportFile,
    renderReport({
        rule,
        startedAt,
        agent:
            agent.kind === "claude"
                ? `Claude Code ${claudeVersion}, model ${agent.model}`
                : `fake, \`${agent.command.split("\n")[0]}\`${agent.command.includes("\n") ? " …" : ""}`,
        cases: ruleCases.cases,
        variants: reports,
    }),
)

// The installs are only for the containers; the projects and diffs stay.
for (const variant of variants) {
    await rm(nodeModulesDir(variant), { recursive: true, force: true })
}
console.log(`report: ${reportFile}`)
