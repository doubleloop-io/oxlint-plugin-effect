import { execFileSync } from "node:child_process"
import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { devDependencyVersion } from "../dev-dependency.ts"
import type { EvalCase, RuleCases } from "./cases.ts"

const pluginName = "@doubleloop-io/oxlint-plugin-effect"

// The project files every copy of a fixture shares; `src/` holds the case.
const projectFiles = ["package.json", "tsconfig.json", ".oxlintrc.json"]

// The `all` preset of the variant, as users enable it, so a fix that trips another rule leaves
// the lint unclean; Oxlint's own rules are off. The gate still lets a case report only the rule
// under test.
export const lintSetup = "the `all` preset"

const oxlintrc = () =>
    `${JSON.stringify(
        {
            plugins: [],
            categories: { correctness: "off" },
            extends: [`./node_modules/${pluginName}/dist/presets/all.json`],
        },
        null,
        4,
    )}\n`

// The project of a variant, installed once with npm, whose node_modules has no links out of
// the directory, so a container can mount it.
export const installVariant = async (options: {
    readonly templateDir: string
    readonly tarball: string
    readonly installDir: string
}) => {
    const { templateDir, tarball, installDir } = options
    await mkdir(installDir, { recursive: true })
    await cp(templateDir, installDir, { recursive: true })
    await copyFile(tarball, join(installDir, "plugin.tgz"))
    const manifest: unknown = JSON.parse(await readFile(join(installDir, "package.json"), "utf8"))
    if (typeof manifest !== "object" || manifest === null || !("devDependencies" in manifest)) {
        throw new Error(`${templateDir}/package.json has no devDependencies`)
    }
    const devDependencies = {
        ...(typeof manifest.devDependencies === "object" ? manifest.devDependencies : {}),
        [pluginName]: "file:./plugin.tgz",
        oxlint: await devDependencyVersion("oxlint"),
        typescript: await devDependencyVersion("typescript"),
    }
    await writeFile(
        join(installDir, "package.json"),
        `${JSON.stringify({ ...manifest, devDependencies }, null, 4)}\n`,
    )
    await writeFile(join(installDir, ".oxlintrc.json"), oxlintrc())
    // The native binaries (oxlint, typescript) must be the container's, not the host's: the image is
    // node:22-bookworm-slim (Linux, glibc) on the host's architecture. Change these with the image.
    execFileSync(
        "npm",
        [
            "install",
            "--os=linux",
            `--cpu=${process.arch}`,
            "--libc=glibc",
            "--no-audit",
            "--no-fund",
            "--loglevel=error",
        ],
        { cwd: installDir, stdio: "inherit" },
    )
}

export const caseSource = (globalPreamble: string, ruleCases: RuleCases, evalCase: EvalCase) =>
    `${[globalPreamble, ruleCases.preamble, evalCase.code]
        .map((part) => part.trim())
        .filter((part) => part !== "")
        .join("\n\n")}\n`

export const caseFile = "src/case.ts"

// A copy of the project with the case, without node_modules: the container mounts the
// variant's at /work/node_modules, read-only.
export const writeCaseProject = async (installDir: string, projectDir: string, source: string) => {
    await mkdir(join(projectDir, "src"), { recursive: true })
    for (const file of projectFiles) {
        await copyFile(join(installDir, file), join(projectDir, file))
    }
    await writeFile(join(projectDir, caseFile), source)
}

// A fresh copy of a case project, with the empty mount point the container needs, created here
// so it belongs to the user and not to Docker.
export const copyCaseProject = async (pristineDir: string, workDir: string) => {
    await cp(pristineDir, workDir, { recursive: true })
    await mkdir(join(workDir, "node_modules"), { recursive: true })
}
