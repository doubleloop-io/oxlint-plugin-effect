import { readFile } from "node:fs/promises"

// The version range of a devDependency of the repository, as written in its package.json.
export const devDependencyVersion = async (name: string) => {
    const manifest: unknown = JSON.parse(
        await readFile(new URL("../package.json", import.meta.url), "utf8"),
    )
    const devDependencies =
        typeof manifest === "object" && manifest !== null && "devDependencies" in manifest
            ? manifest.devDependencies
            : undefined
    const version =
        typeof devDependencies === "object" && devDependencies !== null
            ? Object.entries(devDependencies).find(([key]) => key === name)?.[1]
            : undefined
    if (typeof version !== "string") throw new Error(`package.json has no ${name} devDependency`)
    return version
}
