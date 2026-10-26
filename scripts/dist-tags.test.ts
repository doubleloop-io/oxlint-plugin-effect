import assert from "node:assert/strict"
import { test } from "node:test"

import { distTagsFor } from "./dist-tags.ts"

test("a prerelease is latest and next while no stable version is published", () => {
    assert.deepEqual(distTagsFor("0.1.0-rc.2", ["0.1.0-rc.0", "0.1.0-rc.1"]), ["latest", "next"])
})

test("a prerelease is only next once a stable version is published", () => {
    assert.deepEqual(distTagsFor("0.2.0-rc.0", ["0.1.0-rc.1", "0.1.0"]), ["next"])
})

test("a stable version is latest", () => {
    assert.deepEqual(distTagsFor("0.1.0", ["0.1.0-rc.2"]), ["latest"])
})
