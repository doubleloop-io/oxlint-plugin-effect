const settingKeys = ["entryFiles", "testFiles", "discriminants"] as const

type SettingKey = (typeof settingKeys)[number]

export type FileSettingKey = Exclude<SettingKey, "discriminants">

const isSettingKey = (name: string): name is SettingKey => settingKeys.some((key) => key === name)

const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
    Array.isArray(value) && value.every((item) => typeof item === "string")

const invalid = (problem: string) =>
    new Error(`Invalid settings["dl-effect"]: ${problem}. Known keys: ${settingKeys.join(", ")}.`)

// Every key is checked on every read, not only the requested one: a typo surfaces as soon as any
// enabled rule reads a setting, even when no rule reads the misspelled key.
export const projectSetting = (settings: Readonly<Record<string, unknown>>, key: SettingKey) => {
    const pluginSettings = settings["dl-effect"]
    if (pluginSettings === undefined) return undefined
    if (
        typeof pluginSettings !== "object" ||
        pluginSettings === null ||
        Array.isArray(pluginSettings)
    ) {
        throw invalid("expected an object")
    }
    let configured: ReadonlyArray<string> | undefined
    for (const [name, value] of Object.entries(pluginSettings)) {
        if (!isSettingKey(name)) throw invalid(`unknown key "${name}"`)
        if (!isStringArray(value)) throw invalid(`"${name}" must be an array of strings`)
        if (name === key) configured = value
    }
    return configured
}
