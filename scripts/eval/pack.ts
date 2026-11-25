import { execFileSync } from "node:child_process"
import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"

import { npmPack } from "../npm-pack.ts"

const git = (repoDir: string, args: readonly string[]) =>
    execFileSync("git", args, { cwd: repoDir, encoding: "utf8" }).trim()

export type Packed = { readonly tarball: string; readonly label: string }

// The working tree as it is, uncommitted changes included.
export const packWorkingTree = (repoDir: string, destination: string): Packed => {
    execFileSync("pnpm", ["build"], { cwd: repoDir, stdio: "inherit" })
    const head = git(repoDir, ["rev-parse", "--short", "HEAD"])
    const dirty = git(repoDir, ["status", "--porcelain", "--", "src"]) !== ""
    return {
        tarball: npmPack(destination, repoDir).tarball,
        label: `working tree (${head}${dirty ? " + uncommitted changes in src/" : ""})`,
    }
}

// A commit, exported with `git archive` and built in its own directory, so the checkout and
// its worktrees stay untouched.
export const packRef = async (repoDir: string, ref: string, destination: string) => {
    const commit = git(repoDir, ["rev-parse", "--verify", `${ref}^{commit}`])
    const sourceDir = join(destination, "source")
    await mkdir(sourceDir, { recursive: true })
    execFileSync("sh", ["-c", 'git archive "$1" | tar -x -C "$2"', "sh", commit, sourceDir], {
        cwd: repoDir,
        stdio: ["ignore", "inherit", "inherit"],
    })
    execFileSync("pnpm", ["install", "--frozen-lockfile"], { cwd: sourceDir, stdio: "inherit" })
    execFileSync("pnpm", ["build"], { cwd: sourceDir, stdio: "inherit" })
    const { tarball } = npmPack(destination, sourceDir)
    await rm(sourceDir, { recursive: true, force: true })
    return { tarball, label: `${ref} (${commit.slice(0, 7)})` } satisfies Packed
}
