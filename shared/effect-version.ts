import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"

const majorIn = (manifestPath: string) => {
    try {
        const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"))
        if (
            typeof manifest !== "object" ||
            manifest === null ||
            !("version" in manifest) ||
            typeof manifest.version !== "string"
        ) {
            return undefined
        }
        const major = Number.parseInt(manifest.version, 10)
        return Number.isNaN(major) ? undefined : major
    } catch {
        return undefined
    }
}

// The nearest `effect` up the tree, as Node resolves it. Not cached, like `@effect/vitest` in
// `prefer-effect-vitest`: a long-lived linter would miss an upgrade.
export const installedEffectMajor = (filename: string) => {
    for (let dir = dirname(filename); ; dir = dirname(dir)) {
        const major = majorIn(join(dir, "node_modules", "effect", "package.json"))
        if (major !== undefined) return major
        if (dirname(dir) === dir) return undefined
    }
}
