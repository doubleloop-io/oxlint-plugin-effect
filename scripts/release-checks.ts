import { execFileSync } from "node:child_process"

const bumpKeywords = ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"]
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u

export const usage = `usage: pnpm release <${bumpKeywords.join(" | ")} | x.y.z[-rc.n]>`

const commits = (count: number) => `${count} ${count === 1 ? "commit" : "commits"}`

export const bumpProblem = (bump: string, publishedVersions: readonly string[]) => {
    if (bumpKeywords.includes(bump)) return undefined
    if (!versionPattern.test(bump)) {
        return `"${bump}" is neither a bump keyword nor a version\n  ${usage}`
    }
    if (publishedVersions.includes(bump)) return `${bump} is already published`
    return undefined
}

export const syncProblem = (ahead: number, behind: number) => {
    if (ahead > 0 && behind > 0) {
        return `main and origin/main have diverged (${commits(ahead)} local, ${commits(behind)} remote): rebase onto origin/main`
    }
    if (ahead > 0) return `main is ${commits(ahead)} ahead of origin/main: run git push`
    if (behind > 0) return `main is ${commits(behind)} behind origin/main: run git pull`
    return undefined
}

// Each check reports its own problem, so the command's stderr would only repeat it.
const capture = (command: string, args: string[]) => {
    try {
        return execFileSync(command, args, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        }).trim()
    } catch {
        return undefined
    }
}

const gitSyncProblem = () => {
    if (capture("git", ["fetch", "origin", "main"]) === undefined) return "cannot fetch origin/main"
    const counts = capture("git", ["rev-list", "--left-right", "--count", "HEAD...origin/main"])
    const [ahead, behind] = (counts ?? "").split(/\s+/u).map(Number)
    if (ahead === undefined || behind === undefined || Number.isNaN(ahead + behind)) {
        return "cannot compare main with origin/main"
    }
    return syncProblem(ahead, behind)
}

// Collects every problem at once, so one run lists all there is to fix.
export const releaseProblems = (bump: string, publishedVersions: readonly string[]) => {
    const branch = capture("git", ["branch", "--show-current"])
    const problems = [
        bumpProblem(bump, publishedVersions),
        branch === "main" ? undefined : `release from main, not ${branch || "a detached HEAD"}`,
        capture("git", ["status", "--porcelain"]) === ""
            ? undefined
            : "the working tree has uncommitted changes: commit or stash them",
        gitSyncProblem(),
        capture("npm", ["whoami"]) === undefined
            ? "npm whoami failed, not logged in or offline: run npm login"
            : undefined,
    ]
    return problems.filter((problem) => problem !== undefined)
}
