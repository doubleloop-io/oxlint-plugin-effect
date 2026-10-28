import assert from "node:assert/strict"
import { test } from "node:test"

import { readmeMdSource } from "./readmeMdSource.ts"
import { readmeMarkdown } from "./sourceMarkdownBuilders.ts"

const pagesOf = (readmeMd: string) => readmeMdSource(readmeMd).sourcePages.map(({ page }) => page)

const pageById = (readmeMd: string, id: string) => pagesOf(readmeMd).find((page) => page.id === id)

test("each section of the README becomes a page named after its heading, in README order", () => {
    const readmeMd = readmeMarkdown(
        "## Installation\n\n```bash\npnpm add -D the-plugin\n```\n",
        "## Versioning\n\nVersions are `0.x`.\n",
    )

    const pages = pagesOf(readmeMd).filter(({ kind }) => kind === "guide")

    assert.deepEqual(pages, [
        {
            kind: "guide",
            id: "installation",
            title: "Installation",
            body: "```bash\npnpm add -D the-plugin\n```\n",
        },
        { kind: "guide", id: "versioning", title: "Versioning", body: "Versions are `0.x`.\n" },
    ])
})

test("a subsection stays on the page of its section, one heading level up", () => {
    const readmeMd = readmeMarkdown(
        "## Configuration\n\nExtend the preset.\n\n### Configuration options\n\nThree settings.\n",
    )

    const page = pageById(readmeMd, "configuration")

    assert.equal(page?.body, "Extend the preset.\n\n## Configuration options\n\nThree settings.\n")
})

test("the Rules section is the rules overview page", () => {
    const readmeMd = readmeMarkdown(
        "## Rules\n\n| Topic | Rules |\n\n### Absorbed from anti-slop\n\nSome rules.\n",
    )

    const page = pageById(readmeMd, "rules-overview")

    assert.deepEqual(page, {
        kind: "guide",
        id: "rules-overview",
        title: "Rules overview",
        body: "| Topic | Rules |\n\n## Absorbed from anti-slop\n\nSome rules.\n",
    })
})

test("the Development section and its subsections are on no page", () => {
    const readmeMd = readmeMarkdown(
        "## Versioning\n\nVersions are `0.x`.\n",
        "## Development\n\n- `pnpm format`: formats.\n\n### Releasing\n\n- `pnpm release`.\n",
    )

    const pages = pagesOf(readmeMd)

    assert.ok(!pages.some(({ id }) => id === "development"))
    assert.ok(!pages.some(({ body }) => body.includes("pnpm format") || body.includes("Releasing")))
})

test("an unscoped package name is the whole landing title, and an introduction of one paragraph leaves an empty body", () => {
    const page = pageById(readmeMarkdown(), "index")

    assert.ok(page?.kind === "landing")
    assert.equal(page.scope, undefined)
    assert.equal(page.name, "the-plugin")
    assert.equal(page.tagline, "A plugin.")
    assert.equal(page.body, "")
})
