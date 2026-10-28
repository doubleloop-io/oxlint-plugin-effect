import { matchesGlob, relative, sep } from "node:path"

import { projectSetting, type FileSettingKey } from "./settings.ts"

type FileContext = {
    readonly filename: string
    readonly cwd: string
    readonly settings: Readonly<Record<string, unknown>>
}

// Globs match the path relative to the working directory, with `/` on every platform.
export const makeFileMatcher =
    (key: FileSettingKey, defaults: ReadonlyArray<string>) => (context: FileContext) => {
        const path = relative(context.cwd, context.filename).split(sep).join("/")
        const patterns = projectSetting(context.settings, key) ?? defaults
        return patterns.some((pattern) => matchesGlob(path, pattern))
    }
