import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import dlEffectPlugin from "./index.ts"

const ruleHeading = /^### `([a-z-]+)`$/gmu

const documentedRules = async () => {
    const rulesMd = await readFile(new URL("RULES.md", import.meta.url), "utf8")
    return [...rulesMd.matchAll(ruleHeading)].map(([, rule]) => rule).sort()
}

test("RULES.md has one section per rule of the plugin", async () => {
    const pluginRules = Object.keys(dlEffectPlugin.rules).sort()

    assert.deepEqual(await documentedRules(), pluginRules)
})
