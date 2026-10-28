import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { readAllJson, renderAllJson } from "./preset-all-json.ts"

const distAllJs = new URL("../dist/presets/all.js", import.meta.url)

const hasJsPlugins = (value: unknown): value is { jsPlugins: unknown[] } =>
    typeof value === "object" &&
    value !== null &&
    "jsPlugins" in value &&
    Array.isArray(value.jsPlugins)

test("compiled all.js points jsPlugins at a plugin file that exists", async () => {
    assert.ok(existsSync(distAllJs), "run `pnpm build`")

    const { default: all }: { default: unknown } = await import(distAllJs.href)

    assert.ok(hasJsPlugins(all))
    const [pluginPath] = all.jsPlugins
    assert.equal(typeof pluginPath, "string")
    assert.ok(existsSync(String(pluginPath)), `${pluginPath} does not exist`)
})

test("compiled all.json points jsPlugins at a plugin file that exists", async () => {
    const json = await readAllJson()
    assert.equal(json, renderAllJson(), "run `pnpm build`")

    const all: unknown = JSON.parse(json)

    assert.ok(hasJsPlugins(all))
    const [pluginPath] = all.jsPlugins
    assert.equal(typeof pluginPath, "string")
    const pluginUrl = new URL(String(pluginPath), new URL("../dist/presets/", import.meta.url))
    assert.ok(existsSync(fileURLToPath(pluginUrl)), `${pluginUrl} does not exist`)
})
