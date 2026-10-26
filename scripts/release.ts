import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"

import { distTagsFor } from "./dist-tags.ts"

const run = (command: string, args: string[]) => {
    execFileSync(command, args, { stdio: "inherit" })
}

const output = (command: string, args: string[]) =>
    execFileSync(command, args, { encoding: "utf8" }).trim()

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
        throw new Error("package.json has no name or version")
    }
    return { name: manifest.name, version: manifest.version }
}

// `npm view --json` prints a bare string instead of an array when one version is published.
const publishedVersions = (name: string) => {
    const versions: unknown = JSON.parse(output("npm", ["view", name, "versions", "--json"]))
    const list = typeof versions === "string" ? [versions] : versions
    if (!Array.isArray(list) || !list.every((version) => typeof version === "string")) {
        throw new Error(`unexpected \`npm view versions\` output: ${JSON.stringify(versions)}`)
    }
    return list
}

const assertReleasableHead = () => {
    if (output("git", ["branch", "--show-current"]) !== "main") {
        throw new Error("release from main")
    }
    if (output("git", ["status", "--porcelain"]) !== "") {
        throw new Error("the working tree is not clean")
    }
    run("git", ["fetch", "origin", "main"])
    if (output("git", ["rev-parse", "HEAD"]) !== output("git", ["rev-parse", "origin/main"])) {
        throw new Error("main differs from origin/main")
    }
}

const bump = process.argv[2]
if (bump === undefined) {
    throw new Error("usage: pnpm release <prerelease | patch | minor | major | x.y.z[-rc.n]>")
}

assertReleasableHead()
const { name } = await readManifest()
const published = publishedVersions(name)
run("pnpm", ["build-and-pack"])

run("npm", ["version", bump, "--preid", "rc", "--message", "Release %s"])
const { version } = await readManifest()
const [publishTag = "latest", ...otherTags] = distTagsFor(version, published)

try {
    // assertReleasableHead already ran the git checks, which would now see main ahead of origin.
    run("pnpm", ["publish", "--tag", publishTag, "--no-git-checks"])
} catch (error) {
    // Nothing reached the registry: drop the bump so a retry starts from the same commit.
    run("git", ["tag", "--delete", `v${version}`])
    run("git", ["reset", "--keep", "HEAD~1"])
    throw error
}

for (const tag of otherTags) run("npm", ["dist-tag", "add", `${name}@${version}`, tag])
run("git", ["push", "--atomic", "origin", "main", `v${version}`])
console.log(`released ${name}@${version} as ${[publishTag, ...otherTags].join(", ")}`)
