import { fileURLToPath } from "node:url"

import type { OxlintConfig } from "oxlint"

import betterEffectPlugin, { pluginName } from "../index.ts"

const allRules = Object.fromEntries(
    Object.keys(betterEffectPlugin.rules).map((rule) => [`${pluginName}/${rule}`, "warn"] as const),
)

// Absolute because an imported config object carries no location of its own: a relative
// path would resolve against the consumer's config file, not this package.
const all = {
    jsPlugins: [fileURLToPath(new URL("../index.ts", import.meta.url))],
    rules: allRules,
} satisfies OxlintConfig

export default all
