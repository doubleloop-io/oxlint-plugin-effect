import { execFileSync } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"

import { runChecks } from "./checks.ts"
import { runContainer } from "./docker.ts"
import { copyCaseProject } from "./fixture.ts"

// Neutral on purpose: it names the tools, not the rule or the shape of the fix.
export const agentPrompt =
    "Run `npx oxlint` in this project and fix every problem it reports in `src/`. " +
    "Do not use `--fix`. Keep `npx tsc --noEmit` passing."

export type Agent =
    | {
          readonly kind: "claude"
          readonly model: string
          readonly maxBudgetUsd: number
          readonly envFile: string
      }
    // A shell command run in /work instead of Claude, to try the pipeline without spending.
    | { readonly kind: "fake"; readonly command: string }

const agentCommand = (agent: Agent) =>
    agent.kind === "fake"
        ? ["sh", "-c", agent.command]
        : [
              "claude",
              "-p",
              agentPrompt,
              "--bare",
              "--model",
              agent.model,
              "--dangerously-skip-permissions",
              "--strict-mcp-config",
              // Without it, the skills bundled with Claude Code stay available to the agent.
              "--disable-slash-commands",
              "--no-session-persistence",
              "--output-format",
              "stream-json",
              "--verbose",
              "--max-budget-usd",
              String(agent.maxBudgetUsd),
          ]

export type AgentSummary = {
    readonly costUsd: number | undefined
    readonly turns: number | undefined
    readonly isError: boolean | undefined
    // The `init` event: tools, MCP servers, skills and plugins the agent started with.
    readonly init: unknown
}

const events = (stdout: string) =>
    stdout.split("\n").flatMap((line): unknown[] => {
        try {
            return [JSON.parse(line)]
        } catch {
            return []
        }
    })

const field = (event: unknown, name: string): unknown =>
    typeof event === "object" && event !== null && name in event
        ? Object.entries(event).find(([key]) => key === name)?.[1]
        : undefined

export const summarizeAgent = (stdout: string): AgentSummary => {
    const all = events(stdout)
    const result = all.findLast((event) => field(event, "type") === "result")
    const init = all.find(
        (event) => field(event, "type") === "system" && field(event, "subtype") === "init",
    )
    const costUsd = field(result, "total_cost_usd")
    const turns = field(result, "num_turns")
    const isError = field(result, "is_error")
    return {
        costUsd: typeof costUsd === "number" ? costUsd : undefined,
        turns: typeof turns === "number" ? turns : undefined,
        isError: typeof isError === "boolean" ? isError : undefined,
        init,
    }
}

// The agent's changes, with paths relative to the project.
const diffOf = (runDir: string) => {
    try {
        execFileSync("git", ["diff", "--no-index", "--no-color", "pristine", "work"], {
            cwd: runDir,
            encoding: "utf8",
        })
        return ""
    } catch (error) {
        const stdout = typeof error === "object" && error !== null ? field(error, "stdout") : ""
        if (typeof stdout !== "string") throw error
        return stdout.replaceAll(" a/pristine/", " a/").replaceAll(" b/work/", " b/")
    }
}

const suppression = /^\+.*(oxlint-disable|eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck)/m

// What makes a run not count, besides failing checks: changes outside `src/`, such as the
// lint or TypeScript config, and comments that silence the report.
export const tamperings = (diff: string) => {
    const touched = [...diff.matchAll(/^diff --git a\/(\S+)/gm)].map((match) => match[1] ?? "")
    return [
        ...touched
            .filter((path) => !path.startsWith("src/"))
            .map((path) => `changed ${path}, outside src/`),
        ...(suppression.test(diff) ? ["added a comment that silences a report"] : []),
    ]
}

export type RunOutcome = {
    readonly valid: boolean
    readonly reasons: readonly string[]
    readonly diff: string
    readonly agent: AgentSummary
}

export const executeRun = async (options: {
    readonly agent: Agent
    readonly pristineDir: string
    readonly nodeModulesDir: string
    readonly runDir: string
    readonly timeoutMs: number
}): Promise<RunOutcome> => {
    const { agent, pristineDir, nodeModulesDir, runDir, timeoutMs } = options
    const workDir = join(runDir, "work")
    await copyCaseProject(pristineDir, workDir)
    // A second copy beside it, outside the mount, so the diff has short paths.
    await copyCaseProject(pristineDir, join(runDir, "pristine"))

    const container = await runContainer({
        workDir,
        nodeModulesDir,
        command: agentCommand(agent),
        network: agent.kind === "claude",
        ...(agent.kind === "claude" ? { envFile: agent.envFile } : {}),
        timeoutMs,
    })
    await writeFile(join(runDir, "agent.jsonl"), container.stdout)
    await writeFile(join(runDir, "agent.stderr.txt"), container.stderr)
    const summary = summarizeAgent(container.stdout)

    const diff = diffOf(runDir)
    await writeFile(join(runDir, "diff.patch"), diff)
    const checks = await runChecks(workDir, nodeModulesDir)
    await writeFile(join(runDir, "checks.json"), `${JSON.stringify(checks, null, 4)}\n`)

    const reasons = [
        ...(container.timedOut ? [`timed out after ${timeoutMs / 60000} minutes`] : []),
        ...(container.exitCode === 0 ? [] : [`agent exited with ${container.exitCode}`]),
        ...(summary.isError === true ? ["agent reported an error"] : []),
        ...(diff === "" ? ["no change"] : []),
        ...(checks.tscPassed ? [] : ["tsc fails"]),
        ...(checks.diagnostics.length === 0
            ? []
            : [`lint not clean: ${checks.diagnostics.length} report(s)`]),
        ...tamperings(diff),
    ]
    return { valid: reasons.length === 0, reasons, diff, agent: summary }
}
