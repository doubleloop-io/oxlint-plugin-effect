import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { npmPack } from "./npm-pack.ts"

// Internal project names and local paths must never reach the public tarball. The list only
// protects from the names it holds: add new internal projects here.
const denylist = ["/Users/"]

// Mirrors `files` in package.json; npm adds package.json on its own.
const allowedFiles = ["package.json", "RULES.md", "README.md", "LICENSE", "LICENSE.anti-slop"]
const allowedDirectories = ["dist/"]

const isAllowed = (path: string) =>
    allowedFiles.includes(path) ||
    allowedDirectories.some((directory) => path.startsWith(directory))

const findDenied = (content: string) =>
    denylist.filter((name) => content.toLowerCase().includes(name.toLowerCase()))

const workDir = await mkdtemp(join(tmpdir(), "pack-check-"))
const problems: string[] = []

try {
    const { tarball, files } = npmPack(workDir)
    execFileSync("tar", ["-xzf", tarball, "-C", workDir])

    for (const { path } of files) {
        if (!isAllowed(path)) problems.push(`${path}: outside \`files\``)
        const denied = findDenied(await readFile(join(workDir, "package", path), "utf8"))
        if (denied.length > 0) problems.push(`${path}: contains ${denied.join(", ")}`)
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
