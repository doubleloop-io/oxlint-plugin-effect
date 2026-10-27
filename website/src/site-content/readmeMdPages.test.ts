import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import { test } from "node:test"

import { headingAnchor } from "./internalLinks.ts"
import { repository } from "./repository.ts"
import { sitePages } from "./sitePages.ts"

const repositoryRoot = new URL("../../../", import.meta.url)
const readmeMarkdown = await readFile(new URL("README.md", repositoryRoot), "utf8")
const rulesMarkdown = await readFile(new URL("RULES.md", repositoryRoot), "utf8")

const base = "/oxlint-plugin-effect"
const pages = sitePages({ rulesMd: rulesMarkdown, readmeMd: readmeMarkdown }, { base, repository })
const readmePages = pages.filter(({ kind }) => kind === "guide" || kind === "landing")

const linkTarget = /\]\((?<href>[^)\s]+)\)/gu
const withoutLinkTargets = (text: string) => text.replace(linkTarget, "](…)")
// A README `##` section is a page, so its `###` subsections are `##` headings there
const withSubsectionsAtPageLevel = (text: string) => text.replace(/^### /gmu, "## ")

const sectionHeadings = [...readmeMarkdown.matchAll(/^## (?<heading>.+)$/gmu)].map(
    ({ groups }) => groups?.heading ?? "",
)

const sourceSection = (heading: string) => {
    const start = readmeMarkdown.indexOf(`${heading}\n`)
    const next = readmeMarkdown.slice(start + 1).search(/^## /mu)
    const end = next === -1 ? undefined : start + 1 + next
    return readmeMarkdown.slice(start, end).replace(`${heading}\n`, "").trim()
}

const pageText = (body: string) => withoutLinkTargets(body).trim()
const sourceText = (section: string) => withoutLinkTargets(withSubsectionsAtPageLevel(section))

test("the README introduction is the landing page with its text, except link targets", () => {
    const [title = ""] = readmeMarkdown.split("\n")

    const landing = pages.find(({ kind }) => kind === "landing")

    assert.equal(landing?.title, title.replace(/^# /u, ""))
    assert.equal(pageText(landing?.body ?? ""), sourceText(sourceSection(title)))
})

for (const heading of sectionHeadings.filter((heading) => heading !== "Development")) {
    test(`the README section ${heading} is a page with its text, except link targets`, () => {
        const page = readmePages.find(
            ({ title }) => title === heading || (heading === "Rules" && title === "Rules overview"),
        )

        assert.equal(pageText(page?.body ?? ""), sourceText(sourceSection(`## ${heading}`)))
    })
}

test("no page shows the Development section of the README", () => {
    const blocks = sourceSection("## Development")
        .split("\n")
        .filter((line) => line.startsWith("- "))
    assert.ok(blocks.length > 0)

    for (const page of pages) {
        for (const block of blocks) {
            assert.ok(!page.body.includes(block), `${page.id} shows: ${block}`)
        }
    }
})

const routeOf = (id: string) => (id === "index" ? `${base}/` : `${base}/${id}/`)

const pageHeadingAnchors = (body: string) =>
    [...body.matchAll(/^## (?<heading>.+)$/gmu)].map(({ groups }) =>
        headingAnchor(groups?.heading ?? ""),
    )

const readmeHrefs = () => [
    ...readmePages.flatMap(({ body }) =>
        [...body.matchAll(linkTarget)].map(({ groups }) => groups?.href ?? ""),
    ),
    ...readmePages
        .flatMap((page) => (page.kind === "landing" ? page.actions : []))
        .map(({ link }) => link),
]

test("every internal README link points to an existing site page and heading", () => {
    const sitePageHrefs = readmeHrefs().filter((href) => href.startsWith(`${base}/`))
    assert.ok(sitePageHrefs.length > 0)

    for (const href of sitePageHrefs) {
        const [route, anchor] = href.split("#")
        const target = pages.find(({ id }) => routeOf(id) === route)
        assert.ok(target, `${href} is not a site page`)
        if (anchor !== undefined) {
            assert.ok(pageHeadingAnchors(target.body).includes(anchor), `${href} has no heading`)
        }
    }
})

test("every README link to a repository file points to a file that exists", async () => {
    const fileHrefs = readmeHrefs().filter((href) => href.startsWith(`${repository}/blob/main/`))
    assert.ok(fileHrefs.length > 0)

    for (const href of fileHrefs) {
        const file = new URL(href.replace(`${repository}/blob/main/`, ""), repositoryRoot)
        await assert.doesNotReject(access(file), `${href} is not a repository file`)
    }
})
