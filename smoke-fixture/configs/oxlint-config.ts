import { defaultTestFiles } from "@doubleloop-io/oxlint-plugin-effect"
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({
    extends: [dlEffectAll],
    rules: { "dl-effect/no-effect-promise": ["warn", { testFiles: [...defaultTestFiles] }] },
})
