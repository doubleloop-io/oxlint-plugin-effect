import assert from "node:assert/strict"
import { readdir } from "node:fs/promises"
import { test } from "node:test"

import dlEffectPlugin from "./index.ts"

const ruleFileName = /^(?<rule>.+)\.md$/u

const documentedRules = async () => {
    const files = await readdir(new URL("../docs/user-guide/rules/", import.meta.url))
    return files.flatMap((file) => ruleFileName.exec(file)?.groups?.rule ?? []).sort()
}

test("the rule catalog has exactly one file per rule of the plugin", async () => {
    const pluginRules = Object.keys(dlEffectPlugin.rules).sort()

    assert.deepEqual(await documentedRules(), pluginRules)
})
