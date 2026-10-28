import type { OxlintConfig } from "oxlint"

import dlEffectPlugin, { pluginName, pluginPath } from "../index.ts"

const allRules = Object.fromEntries(
    Object.keys(dlEffectPlugin.rules).map((rule) => [`${pluginName}/${rule}`, "warn"] as const),
)

// Absolute because an imported config object carries no location of its own: a relative
// path would resolve against the consumer's config file, not this package.
const all = {
    jsPlugins: [pluginPath],
    rules: allRules,
} satisfies OxlintConfig

export default all
