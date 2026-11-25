import { mkdir, readFile, rm } from "node:fs/promises"
import { join, relative } from "node:path"

import { type RuleCases } from "./cases.ts"
import { gateProblems, runChecks } from "./checks.ts"
import { claudeVersion } from "./docker.ts"
import { caseFile, caseSource, installVariant, lintSetup, writeCaseProject } from "./fixture.ts"
import { firstLine } from "./judge.ts"
import { type Packed, packRef, packWorkingTree } from "./pack.ts"
import { runPool } from "./pool.ts"
import type { CaseResults, Results, RunRecord, VariantResults } from "./report.ts"
import { type Agent, executeRun } from "./run.ts"

export type Evaluation = {
    readonly repoDir: string
    readonly evalsDir: string
    readonly resultsDir: string
    readonly ruleCases: RuleCases
    readonly baseRef: string
    readonly baselineOnly: boolean
    readonly runs: number
    readonly concurrency: number
    readonly timeoutMs: number
    readonly agent: Agent
}

type Variant = { readonly name: string; readonly packed: Packed; readonly dir: string }

const installDir = (variant: Variant) => join(variant.dir, "install")
const nodeModulesDir = (variant: Variant) => join(installDir(variant), "node_modules")
const pristineDir = (variant: Variant, name: string) => join(variant.dir, name, "pristine")

const packVariants = async ({ repoDir, resultsDir, baseRef, baselineOnly }: Evaluation) => {
    const variants: Variant[] = []
    const baselineDir = join(resultsDir, "baseline")
    await mkdir(baselineDir, { recursive: true })
    variants.push({
        name: "baseline",
        packed: await packRef(repoDir, baseRef, baselineDir),
        dir: baselineDir,
    })
    if (!baselineOnly) {
        const dir = join(resultsDir, "working-tree")
        await mkdir(dir, { recursive: true })
        variants.push({ name: "working-tree", packed: packWorkingTree(repoDir, dir), dir })
    }
    return variants
}

// Every case of every variant must compile and report the rule before any agent runs.
const gate = async (evaluation: Evaluation, variants: readonly Variant[]) => {
    const { evalsDir, ruleCases } = evaluation
    const globalPreamble = await readFile(join(evalsDir, "preamble.ts"), "utf8")
    const problems: string[] = []
    const gated = new Map<Variant, CaseResults[]>()
    for (const variant of variants) {
        await installVariant({
            templateDir: join(evalsDir, "template"),
            tarball: variant.packed.tarball,
            installDir: installDir(variant),
        })
        const cases: CaseResults[] = []
        for (const evalCase of ruleCases.cases) {
            const projectDir = pristineDir(variant, evalCase.name)
            await writeCaseProject(
                installDir(variant),
                projectDir,
                caseSource(globalPreamble, ruleCases, evalCase),
            )
            const checks = await runChecks(projectDir, nodeModulesDir(variant))
            for (const problem of gateProblems(ruleCases.rule, checks)) {
                problems.push(`${variant.name} / ${evalCase.name}: ${problem}`)
            }
            cases.push({
                name: evalCase.name,
                source: await readFile(join(projectDir, caseFile), "utf8"),
                reported: checks.diagnostics,
                runs: [],
            })
        }
        gated.set(variant, cases)
    }
    return { problems, gated }
}

// Packs, gates and runs the agents; the results are not judged yet.
export const evaluate = async (evaluation: Evaluation): Promise<Results> => {
    const { resultsDir, ruleCases, agent, runs, concurrency, timeoutMs } = evaluation
    const startedAt = new Date().toISOString()
    const variants = await packVariants(evaluation)
    const { problems, gated } = await gate(evaluation, variants)
    if (problems.length > 0) {
        throw new Error(`gate failed, no agent ran:\n${problems.map((p) => `- ${p}`).join("\n")}`)
    }

    const tasks = variants.flatMap((variant) =>
        ruleCases.cases.flatMap(({ name }) =>
            Array.from({ length: runs }, (_, index) => ({ variant, caseName: name, index })),
        ),
    )
    const records = await runPool(tasks, concurrency, async ({ variant, caseName, index }) => {
        const runDir = join(variant.dir, caseName, `run-${index + 1}`)
        const label = `${variant.name} / ${caseName} / run ${index + 1}`
        console.log(`${label}: started`)
        const outcome = await executeRun({
            agent,
            pristineDir: pristineDir(variant, caseName),
            nodeModulesDir: nodeModulesDir(variant),
            runDir,
            timeoutMs,
        })
        console.log(`${label}: ${outcome.valid ? "valid" : outcome.reasons.join("; ")}`)
        return { ...outcome, dir: relative(resultsDir, runDir) } satisfies RunRecord
    })

    // The installs are only for the containers; the projects and diffs stay.
    for (const variant of variants) {
        await rm(nodeModulesDir(variant), { recursive: true, force: true })
    }

    const variantResults: VariantResults[] = variants.map((variant) => ({
        name: variant.name,
        label: variant.packed.label,
        cases: (gated.get(variant) ?? []).map((caseResults) => ({
            ...caseResults,
            runs: records.filter((_, index) => {
                const task = tasks[index]
                return task?.variant === variant && task.caseName === caseResults.name
            }),
        })),
    }))
    return {
        rule: ruleCases.rule,
        startedAt,
        agent:
            agent.kind === "claude"
                ? `Claude Code ${claudeVersion}, model ${agent.model}`
                : `fake, \`${firstLine(agent.command)}\``,
        lint: lintSetup,
        cases: ruleCases.cases,
        variants: variantResults,
    }
}
