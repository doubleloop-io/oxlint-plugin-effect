import { matchesGlob, relative, sep } from "node:path"

export const filePatternsSchema = { type: "array", items: { type: "string" }, uniqueItems: true }

type FileContext = {
    readonly filename: string
    readonly cwd: string
    readonly options: ReadonlyArray<unknown>
}

const configuredPatterns = (
    options: ReadonlyArray<unknown>,
    key: string,
    defaults: ReadonlyArray<string>,
): ReadonlyArray<string> => {
    const [first] = options
    if (typeof first !== "object" || first === null) return defaults
    const entry = Object.entries(first).find(([name]) => name === key)
    if (entry === undefined) return defaults
    const patterns = entry[1]
    return Array.isArray(patterns) ? patterns.filter((pattern) => typeof pattern === "string") : []
}

// Globs match the path relative to the working directory, with `/` on every platform.
export const makeFileMatcher =
    (key: string, defaults: ReadonlyArray<string>) => (context: FileContext) => {
        const path = relative(context.cwd, context.filename).split(sep).join("/")
        return configuredPatterns(context.options, key, defaults).some((pattern) =>
            matchesGlob(path, pattern),
        )
    }
