import assert from "node:assert/strict"
import { test } from "node:test"

import { bumpProblem, publicationProblems, syncProblem } from "./release-checks.ts"

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

const publication = (overrides: Partial<Parameters<typeof publicationProblems>[0]> = {}) => ({
    name: "plugin",
    version: "0.1.0-rc.2",
    tagged: true,
    publishedVersions: ["0.1.0-rc.1", "0.1.0-rc.2"],
    distTags: { latest: "0.1.0-rc.2", next: "0.1.0-rc.2" },
    ...overrides,
})

test("a tagged version on npm under its expected dist-tags has no problem", () => {
    assert.deepEqual(publicationProblems(publication()), [])
})

test("an untagged version has no problem, since it is not released yet", () => {
    const unreleased = publication({ tagged: false, publishedVersions: ["0.1.0-rc.1"] })

    assert.deepEqual(publicationProblems(unreleased), [])
})

test("a tagged version missing from npm suggests publishing again from the tag", () => {
    const missing = publication({
        publishedVersions: ["0.1.0-rc.1"],
        distTags: { latest: "0.1.0-rc.1", next: "0.1.0-rc.1" },
    })

    const [problem] = publicationProblems(missing)

    assert.match(problem ?? "", /tag v0\.1\.0-rc\.2 is not on npm/u)
    assert.match(problem ?? "", /git checkout v0\.1\.0-rc\.2 .* pnpm publish --tag latest/u)
    assert.match(problem ?? "", /npm dist-tag add plugin@0\.1\.0-rc\.2 next/u)
})

test("a published version missing one of its dist-tags suggests adding only that one", () => {
    const untagged = publication({ distTags: { latest: "0.1.0-rc.2", next: "0.1.0-rc.1" } })

    assert.deepEqual(publicationProblems(untagged), [
        "npm next is not 0.1.0-rc.2 (a recent release may still be processing); if it stays so:\n  npm dist-tag add plugin@0.1.0-rc.2 next",
    ])
})

test("a prerelease after a stable version expects only next", () => {
    const prerelease = publication({
        version: "0.2.0-rc.0",
        publishedVersions: ["0.1.0", "0.2.0-rc.0"],
        distTags: { latest: "0.1.0", next: "0.2.0-rc.0" },
    })

    assert.deepEqual(publicationProblems(prerelease), [])
})
