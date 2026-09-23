import assert from "node:assert/strict"
import { test } from "node:test"

import { readAllJson, renderAllJson } from "./all-json.ts"

test("all.json matches the rules exported by all.ts", async () => {
    assert.equal(await readAllJson(), renderAllJson(), "run `pnpm presets:json`")
})
