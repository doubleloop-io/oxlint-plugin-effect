import { type Diagnostic, parseDiagnostics } from "../oxlint-diagnostics.ts"
import { runContainer } from "./docker.ts"
import { caseFile } from "./fixture.ts"

export type Checks = {
    readonly tscPassed: boolean
    readonly tscOutput: string
    readonly diagnostics: readonly Diagnostic[]
}

const timeoutMs = 5 * 60 * 1000

// `tsc` and `oxlint` on a case project, in a container without network, against the variant's
// node_modules.
export const runChecks = async (workDir: string, nodeModulesDir: string): Promise<Checks> => {
    const inContainer = (command: readonly string[]) =>
        runContainer({ workDir, nodeModulesDir, command, network: false, timeoutMs })
    const tsc = await inContainer(["node_modules/.bin/tsc", "--noEmit", "-p", "."])
    const oxlint = await inContainer(["node_modules/.bin/oxlint", "--format", "json", "src"])
    if (oxlint.stdout.trim() === "") {
        throw new Error(`oxlint printed nothing in ${workDir}:\n${oxlint.stderr}`)
    }
    return {
        tscPassed: tsc.exitCode === 0,
        tscOutput: `${tsc.stdout}${tsc.stderr}`.trim(),
        diagnostics: parseDiagnostics(oxlint.stdout),
    }
}

// Why a case project is not ready for agents: it must compile, and report the rule under test
// on the case file and nothing else.
export const gateProblems = (rule: string, checks: Checks) => {
    const problems: string[] = []
    if (!checks.tscPassed) problems.push(`tsc fails:\n${checks.tscOutput}`)
    const expected = `dl-effect(${rule})`
    if (
        !checks.diagnostics.some(({ code, filename }) => code === expected && filename === caseFile)
    ) {
        problems.push(`oxlint does not report ${expected} on ${caseFile}`)
    }
    for (const { code, filename, line, message } of checks.diagnostics) {
        if (code !== expected)
            problems.push(`unexpected ${code} at ${filename}:${line}: ${message}`)
    }
    return problems
}
