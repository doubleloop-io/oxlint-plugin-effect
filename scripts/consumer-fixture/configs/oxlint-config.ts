import { defaultTestFiles } from "@doubleloop-io/oxlint-plugin-effect"
import dlEffectAll from "@doubleloop-io/oxlint-plugin-effect/presets/all"
import { defineConfig } from "oxlint"

export default defineConfig({
    extends: [dlEffectAll],
    settings: { "dl-effect": { testFiles: [...defaultTestFiles] } },
})
