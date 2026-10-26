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

// npm 11 prints the dist-tags object, npm 12 an array holding it.
const publishedDistTags = (name: string) => {
    const viewed: unknown = JSON.parse(output("npm", ["view", name, "dist-tags", "--json"]))
    const tags = Array.isArray(viewed) && viewed.length === 1 ? viewed[0] : viewed
    const unexpected = new Error(
        `unexpected \`npm view dist-tags\` output: ${JSON.stringify(viewed)}`,
    )
    if (typeof tags !== "object" || tags === null || Array.isArray(tags)) throw unexpected
    return Object.entries(tags).map(([tag, version]) => {
        if (typeof version !== "string") throw unexpected
        return [`npm ${tag}`, version] as const
    })
}

const printStatus = async () => {
    const { name, version } = await readManifest()
    const rows = [["package.json", version] as const, ...publishedDistTags(name)]
    const width = Math.max(...rows.map(([label]) => label.length))
    for (const [label, value] of rows) console.log(`${label.padEnd(width)}  ${value}`)
    console.log(
        "\nusage: pnpm release <prerelease | preminor | patch | minor | major | x.y.z[-rc.n]>",
    )
}

const release = async (bump: string) => {
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
}

const bump = process.argv[2]
await (bump === undefined ? printStatus() : release(bump))
