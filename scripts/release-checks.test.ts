import assert from "node:assert/strict"
import { test } from "node:test"

import { bumpProblem, syncProblem } from "./release-checks.ts"

test("a bump keyword is accepted", () => {
    assert.equal(bumpProblem("preminor", []), undefined)
})

test("an unpublished explicit version is accepted", () => {
    assert.equal(bumpProblem("0.11.0-rc.0", ["0.10.22"]), undefined)
})

test("an explicit version that is already published is rejected", () => {
    assert.match(bumpProblem("0.10.22", ["0.10.22"]) ?? "", /already published/u)
})

test("a bump that is neither a keyword nor a version is rejected with the usage", () => {
    assert.match(bumpProblem("rc", []) ?? "", /usage: pnpm release/u)
})

test("main in sync with origin has no problem", () => {
    assert.equal(syncProblem(0, 0), undefined)
})

test("main ahead of origin asks to push", () => {
    assert.match(syncProblem(1, 0) ?? "", /1 commit ahead .*git push/u)
})

test("main behind origin asks to pull", () => {
    assert.match(syncProblem(0, 2) ?? "", /2 commits behind .*git pull/u)
})

test("main diverged from origin asks to rebase", () => {
    assert.match(syncProblem(1, 2) ?? "", /diverged .*rebase/u)
})
