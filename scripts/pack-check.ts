import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { npmPack } from "./npm-pack.ts"

// Absolute paths of the build machine, such as those a source map can carry, must never reach
// the public tarball.
const localPathMarkers = ["/Users/", "/home/"]

// Mirrors `files` in package.json; npm adds package.json on its own.
const allowedFiles = ["package.json", "README.md", "CHANGELOG.md", "LICENSE", "LICENSE.anti-slop"]
const allowedDirectories = ["dist/", "docs/user-guide/"]

const isAllowed = (path: string) =>
    allowedFiles.includes(path) ||
    allowedDirectories.some((directory) => path.startsWith(directory))

const findLocalPaths = (content: string) =>
    localPathMarkers.filter((marker) => content.includes(marker))

const workDir = await mkdtemp(join(tmpdir(), "pack-check-"))
const problems: string[] = []

try {
    const { tarball, files } = npmPack(workDir)
    execFileSync("tar", ["-xzf", tarball, "-C", workDir])

    for (const { path } of files) {
        if (!isAllowed(path)) problems.push(`${path}: outside \`files\``)
        const localPaths = findLocalPaths(await readFile(join(workDir, "package", path), "utf8"))
        if (localPaths.length > 0) problems.push(`${path}: contains ${localPaths.join(", ")}`)
    }

    try {
        execFileSync("publint", ["run", "--strict", tarball], { stdio: "inherit" })
    } catch {
        problems.push("publint reported problems")
    }
} finally {
    await rm(workDir, { recursive: true, force: true })
}

if (problems.length > 0) {
    console.error(`pack:check failed:\n${problems.map((problem) => `- ${problem}`).join("\n")}`)
    process.exitCode = 1
} else {
    console.log("pack:check passed")
}
