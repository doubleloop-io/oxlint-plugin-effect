import { execFileSync } from "node:child_process"
import { cp, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { devDependencyVersion } from "./dev-dependency.ts"
import { npmPack } from "./npm-pack.ts"
import { parseDiagnostics } from "./oxlint-diagnostics.ts"

const fixtureDir = new URL("./consumer-fixture/", import.meta.url)

// Stored under names oxlint does not discover, so the repo's own lint skips them; each one is
// copied to the name a consumer would use.
const configs = [
    { source: "configs/oxlintrc.json", target: ".oxlintrc.json" },
    { source: "configs/oxlint-config.ts", target: "oxlint.config.ts" },
    { source: "configs/oxlintrc-plugin.json", target: ".oxlintrc.json" },
]

const expected = [
    "dl-effect(no-effect-promise) src/violations.ts:3",
    "dl-effect(try-object-form) src/violations.ts:5",
]

const diagnosticsOf = (output: string) =>
    parseDiagnostics(output).map(({ code, filename, line }) => `${code} ${filename}:${line}`)

const workDir = await mkdtemp(join(tmpdir(), "consumer-test-"))
const projectDir = join(workDir, "project")
const problems: string[] = []

try {
    const { tarball } = npmPack(workDir)
    await cp(fixtureDir, projectDir, { recursive: true })
    // pnpm's isolated node_modules fails on a runtime import missing from `dependencies`.
    execFileSync("pnpm", ["add", "-D", tarball, `oxlint@${await devDependencyVersion("oxlint")}`], {
        cwd: projectDir,
        stdio: "inherit",
    })

    for (const { source, target } of configs) {
        await cp(join(projectDir, source), join(projectDir, target))
        const output = execFileSync("pnpm", ["exec", "oxlint", "--format", "json", "src"], {
            cwd: projectDir,
            encoding: "utf8",
        })
        await rm(join(projectDir, target))

        const actual = diagnosticsOf(output).sort().join("\n")
        if (actual !== expected.join("\n")) {
            problems.push(`${target}: expected\n${expected.join("\n")}\ngot\n${actual}`)
        }
    }
} finally {
    await rm(workDir, { recursive: true, force: true })
}

if (problems.length > 0) {
    console.error(`consumer test failed:\n${problems.map((problem) => `- ${problem}`).join("\n")}`)
    process.exitCode = 1
} else {
    console.log("consumer test passed")
}
