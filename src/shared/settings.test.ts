import assert from "node:assert/strict"
import { test } from "node:test"

import { projectSetting } from "./settings.ts"

test("a setting is undefined when there are no dl-effect settings", () => {
    assert.equal(projectSetting({}, "testFiles"), undefined)
})

test("a setting is undefined when the dl-effect settings omit it", () => {
    assert.equal(projectSetting({ "dl-effect": {} }, "testFiles"), undefined)
})

test("a configured setting replaces the default", () => {
    const settings = { "dl-effect": { entryFiles: ["apps/web/src/app/**/route.ts"] } }

    assert.deepEqual(projectSetting(settings, "entryFiles"), ["apps/web/src/app/**/route.ts"])
})

test("an unknown key in the dl-effect settings throws, so a typo is not silently ignored", () => {
    const settings = { "dl-effect": { testFile: ["**/*.check.ts"] } }

    assert.throws(() => projectSetting(settings, "testFiles"), /unknown key "testFile"/u)
})

for (const [scenario, own] of [
    ["a setting that is not an array", { testFiles: "**/*.check.ts" }],
    ["a setting with a non-string pattern", { discriminants: ["type", 1] }],
    ["dl-effect settings that are not an object", ["**/*.check.ts"]],
] as const) {
    test(`${scenario} throws on a read of any setting`, () => {
        assert.throws(() => projectSetting({ "dl-effect": own }, "testFiles"), /Invalid settings/u)
    })
}
