import { execFileSync } from "node:child_process"
import { cp, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { npmPack } from "./npm-pack.ts"

const fixtureDir = new URL("../consumer-fixture/", import.meta.url)

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

type Diagnostic = { code: string; filename: string; labels: { span: { line: number } }[] }

const isDiagnostic = (value: unknown): value is Diagnostic =>
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    "filename" in value &&
    typeof value.filename === "string" &&
    "labels" in value &&
    Array.isArray(value.labels)

const diagnosticsOf = (output: string) => {
    const parsed: unknown = JSON.parse(output)
    const diagnostics =
        typeof parsed === "object" && parsed !== null && "diagnostics" in parsed
            ? parsed.diagnostics
            : undefined
    if (!Array.isArray(diagnostics) || !diagnostics.every(isDiagnostic)) {
        throw new Error(`unexpected \`oxlint --format json\` output: ${output}`)
    }
    return diagnostics.map(
        ({ code, filename, labels }) => `${code} ${filename}:${labels[0]?.span.line}`,
    )
}

const oxlintVersion = async () => {
    const manifest: unknown = JSON.parse(
        await readFile(new URL("../package.json", import.meta.url), "utf8"),
    )
    const version =
        typeof manifest === "object" &&
        manifest !== null &&
        "devDependencies" in manifest &&
        typeof manifest.devDependencies === "object" &&
        manifest.devDependencies !== null &&
        "oxlint" in manifest.devDependencies
            ? manifest.devDependencies.oxlint
            : undefined
    if (typeof version !== "string") throw new Error("package.json has no oxlint devDependency")
    return version
}

const workDir = await mkdtemp(join(tmpdir(), "consumer-test-"))
const projectDir = join(workDir, "project")
const problems: string[] = []

try {
    const { tarball } = npmPack(workDir)
    await cp(fixtureDir, projectDir, { recursive: true })
    // pnpm's isolated node_modules fails on a runtime import missing from `dependencies`.
    execFileSync("pnpm", ["add", "-D", tarball, `oxlint@${await oxlintVersion()}`], {
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
