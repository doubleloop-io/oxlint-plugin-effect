import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"

import { distTagsFor } from "./dist-tags.ts"
import {
    isTagged,
    publicationProblems,
    releaseProblems,
    republishCommands,
    usage,
} from "./release-checks.ts"

// A failure this script explains itself; any other error is a bug and keeps its stack trace.
class ReleaseFailure extends Error {}

const run = (command: string, args: string[]) => {
    execFileSync(command, args, { stdio: "inherit" })
}

const step = (failure: string, action: () => void) => {
    try {
        action()
    } catch (cause) {
        throw new ReleaseFailure(failure, { cause })
    }
}

const readManifest = async () => {
    const manifest: unknown = JSON.parse(
        await readFile(new URL("../package.json", import.meta.url), "utf8"),
    )
    if (
        typeof manifest !== "object" ||
        manifest === null ||
        !("name" in manifest) ||
        typeof manifest.name !== "string" ||
        !("version" in manifest) ||
        typeof manifest.version !== "string"
    ) {
        throw new ReleaseFailure("package.json has no name or version")
    }
    return { name: manifest.name, version: manifest.version }
}

const npmView = (name: string, field: string) => {
    try {
        const viewed: unknown = JSON.parse(
            execFileSync("npm", ["view", name, field, "--json"], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
            }),
        )
        return viewed
    } catch (cause) {
        throw new ReleaseFailure(`cannot read the ${field} of ${name} from npm`, { cause })
    }
}

// `npm view --json` prints a bare string instead of an array when one version is published.
const publishedVersions = (name: string) => {
    const versions = npmView(name, "versions")
    const list = typeof versions === "string" ? [versions] : versions
    if (!Array.isArray(list) || !list.every((version) => typeof version === "string")) {
        throw new Error(`unexpected \`npm view versions\` output: ${JSON.stringify(versions)}`)
    }
    return list
}

// npm 11 prints the dist-tags object, npm 12 an array holding it.
const publishedDistTags = (name: string) => {
    const viewed = npmView(name, "dist-tags")
    const tags = Array.isArray(viewed) && viewed.length === 1 ? viewed[0] : viewed
    const unexpected = new Error(
        `unexpected \`npm view dist-tags\` output: ${JSON.stringify(viewed)}`,
    )
    if (typeof tags !== "object" || tags === null || Array.isArray(tags)) throw unexpected
    const entries = Object.entries(tags).map(([tag, version]) => {
        if (typeof version !== "string") throw unexpected
        return [tag, version] as const
    })
    return Object.fromEntries(entries)
}

const printStatus = async () => {
    const { name, version } = await readManifest()
    const distTags = publishedDistTags(name)
    const rows = [
        ["package.json", version] as const,
        ...Object.entries(distTags).map(([tag, tagged]) => [`npm ${tag}`, tagged] as const),
    ]
    const width = Math.max(...rows.map(([label]) => label.length))
    for (const [label, value] of rows) console.log(`${label.padEnd(width)}  ${value}`)

    const problems = publicationProblems({
        name,
        version,
        tagged: isTagged(version),
        publishedVersions: publishedVersions(name),
        distTags,
    })
    for (const problem of problems) console.log(`\n! ${problem}`)
    console.log(`\n${usage}`)
}

const release = async (bump: string) => {
    const { name } = await readManifest()
    const published = publishedVersions(name)
    const problems = releaseProblems(bump, published)
    if (problems.length > 0) {
        throw new ReleaseFailure(
            `cannot release, nothing was changed:\n${problems.map((problem) => `- ${problem}`).join("\n")}`,
        )
    }

    step("pnpm build-and-pack failed, nothing was changed", () => {
        run("pnpm", ["build-and-pack"])
    })
    step("npm version failed: check git status and git tag before retrying", () => {
        run("npm", ["version", bump, "--preid", "rc", "--message", "Release %s"])
    })
    const { version } = await readManifest()
    const [publishTag = "latest", ...otherTags] = distTagsFor(version, published)

    try {
        // releaseProblems already ran the git checks, which would now see main ahead of origin.
        run("pnpm", ["publish", "--tag", publishTag, "--no-git-checks"])
    } catch (cause) {
        // Nothing reached the registry: drop the bump so a retry starts from the same commit.
        run("git", ["tag", "--delete", `v${version}`])
        run("git", ["reset", "--keep", "HEAD~1"])
        throw new ReleaseFailure(`publishing ${version} failed, the version bump was undone`, {
            cause,
        })
    }

    const push = ["push", "--atomic", "origin", "main", `v${version}`]
    for (const tag of otherTags) {
        const tagArgs = ["dist-tag", "add", `${name}@${version}`, tag]
        step(
            `published ${name}@${version} as ${publishTag}, but tagging it ${tag} failed; finish with:\n  npm ${tagArgs.join(" ")}\n  git ${push.join(" ")}`,
            () => run("npm", tagArgs),
        )
    }
    step(
        `published ${name}@${version}, but the push failed; finish with:\n  git ${push.join(" ")}`,
        () => run("git", push),
    )
    // With web-based 2FA, npm accepts the change but applies it minutes later, or rarely never.
    console.log(
        [
            `\nrequested ${name}@${version} as ${[publishTag, ...otherTags].join(", ")}; pushed the commit and tag v${version}.`,
            "npm can take a few minutes to show it: check with pnpm release.",
            "If it never shows up, publish again from the tag:",
            ...republishCommands(name, version, [publishTag, ...otherTags]).map(
                (command) => `  ${command}`,
            ),
        ].join("\n"),
    )
}

const bump = process.argv[2]
try {
    await (bump === undefined ? printStatus() : release(bump))
} catch (error) {
    if (!(error instanceof ReleaseFailure)) throw error
    console.error(`\n${error.message}`)
    process.exitCode = 1
}
