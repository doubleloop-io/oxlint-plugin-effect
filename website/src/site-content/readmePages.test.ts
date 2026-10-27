import assert from "node:assert/strict"
import { test } from "node:test"

import { pagesOf, readmeMarkdown, testSite } from "./sourceMarkdownBuilders.ts"

const readmePages = (readmeMd: string) =>
    pagesOf({ readmeMd }).filter(({ kind }) => kind === "guide")

test("each section of the README becomes a page named after its heading, in README order", () => {
    const readmeMd = readmeMarkdown(
        "## Installation\n\n```bash\npnpm add -D the-plugin\n```\n",
        "## Versioning\n\nVersions are `0.x`.\n",
    )

    const pages = readmePages(readmeMd)

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

const pageById = (readmeMd: string, id: string) =>
    pagesOf({ readmeMd }).find((page) => page.id === id)

test("the README introduction is the landing page, with links to installation and to the rules", () => {
    const readmeMd = [
        "# @owner/the-plugin\n\nAn oxlint plugin.\n\nIt complements [tsgo](#alongside-effecttsgo).\n",
        "## Installation\n\n```bash\npnpm add -D the-plugin\n```\n",
        "## Configuration\n\n### Alongside `@effect/tsgo`\n\nBoth.\n",
    ].join("\n")

    const page = pageById(readmeMd, "index")

    assert.deepEqual(page, {
        kind: "landing",
        id: "index",
        title: "@owner/the-plugin",
        body: "An oxlint plugin.\n\nIt complements [tsgo](/site/configuration/#alongside-effecttsgo).\n",
        actions: [
            { text: "Installation", link: "/site/installation/" },
            { text: "Rules index", link: "/site/rules/" },
        ],
    })
})

test("a subsection stays on the page of its section, one heading level up", () => {
    const readmeMd = readmeMarkdown(
        "## Configuration\n\nExtend the preset.\n\n### Configuration options\n\nThree settings.\n",
    )

    const page = pageById(readmeMd, "configuration")

    assert.equal(page?.body, "Extend the preset.\n\n## Configuration options\n\nThree settings.\n")
})

test("a link to a README section points to its page, a link to a subsection to its heading there", () => {
    const readmeMd = readmeMarkdown(
        "## Installation\n\nThen [configure](#configuration), [with tsgo](#alongside-effecttsgo).\n",
        "## Configuration\n\nExtend.\n\n### Alongside `@effect/tsgo`\n\nBoth.\n",
    )

    const page = pageById(readmeMd, "installation")

    assert.equal(
        page?.body,
        "Then [configure](/site/configuration/), [with tsgo](/site/configuration/#alongside-effecttsgo).\n",
    )
})

test("the Rules section is the rules overview, apart from the rules index page", () => {
    const readmeMd = readmeMarkdown(
        "## Rules\n\n| Topic | Rules |\n\n### Absorbed from anti-slop\n\nSome rules.\n",
        "## Versioning\n\nSee the [overview](#rules) and [provenance](#absorbed-from-anti-slop).\n",
    )

    const pages = pagesOf({ readmeMd })

    assert.deepEqual(
        pages.find(({ id }) => id === "rules-overview"),
        {
            kind: "guide",
            id: "rules-overview",
            title: "Rules overview",
            body: "| Topic | Rules |\n\n## Absorbed from anti-slop\n\nSome rules.\n",
        },
    )
    assert.equal(pages.find(({ id }) => id === "rules")?.title, "Rules index")
    assert.equal(
        pages.find(({ id }) => id === "versioning")?.body,
        "See the [overview](/site/rules-overview/) and [provenance](/site/rules-overview/#absorbed-from-anti-slop).\n",
    )
})

test("the Development section and its subsections are on no page", () => {
    const readmeMd = readmeMarkdown(
        "## Versioning\n\nVersions are `0.x`.\n",
        "## Development\n\n- `pnpm format`: formats.\n\n### Releasing\n\n- `pnpm release`.\n",
    )

    const pages = pagesOf({ readmeMd })

    assert.ok(!pages.some(({ id }) => id === "development"))
    assert.ok(!pages.some(({ body }) => body.includes("pnpm format") || body.includes("Releasing")))
})

test("a link to the Development section fails, as it has no site page", () => {
    const readmeMd = readmeMarkdown(
        "## Versioning\n\nSee [releasing](#development).\n",
        "## Development\n\n- `pnpm release`.\n",
    )

    assert.throws(() => pagesOf({ readmeMd }), {
        message: "README.md, section `Versioning`: link `#development` resolves to no site page",
    })
})

test("a link to a repository file with no site page points to the file on the main branch", () => {
    const readmeMd = readmeMarkdown("## Versioning\n\nSee [the license](LICENSE.anti-slop).\n")

    const page = pageById(readmeMd, "versioning")

    assert.equal(
        page?.body,
        `See [the license](${testSite.repositoryUrl}/blob/main/LICENSE.anti-slop).\n`,
    )
})

test("a link to RULES.md points to the rules index, a link to a rule in it to the rule page", () => {
    const readmeMd = readmeMarkdown(
        "## Versioning\n\nIn [`RULES.md`](RULES.md), such as [this](RULES.md#no-effect-promise).\n",
    )

    const page = pageById(readmeMd, "versioning")

    assert.equal(
        page?.body,
        "In [`RULES.md`](/site/rules/), such as [this](/site/rules/no-effect-promise/).\n",
    )
})
