import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import { test } from "node:test"

import { headingAnchor, markdownLink, markdownLinkHrefs } from "./internalLinks.ts"
import { publishedSite } from "./publishedSite.ts"
import { maintainerSections, renamedSections } from "./readmeMdSource.ts"
import { expectedRulesMdRoute, repositoryRoot, rulesMarkdown } from "./realRulesMd.ts"
import { sitePages } from "./sitePages.ts"

const readmeMarkdown = await readFile(new URL("README.md", repositoryRoot), "utf8")

const { base, repositoryUrl } = publishedSite
const pages = sitePages({ rulesMd: rulesMarkdown, readmeMd: readmeMarkdown }, publishedSite)
const readmePages = pages.filter(({ kind }) => kind === "guide" || kind === "landing")

// A README `##` section is a page, so its `###` subsections are `##` headings there
const withSubsectionsAtPageLevel = (text: string) => text.replace(/^### /gmu, "## ")

const sectionHeadings = [...readmeMarkdown.matchAll(/^## (?<heading>.+)$/gmu)].map(
    ({ groups }) => groups?.heading ?? "",
)
const publishedHeadings = sectionHeadings.filter((heading) => !maintainerSections.has(heading))
const pageTitle = (heading: string) => renamedSections.get(heading)?.title ?? heading

const sourceSection = (heading: string) => {
    const start = readmeMarkdown.indexOf(`${heading}\n`)
    const next = readmeMarkdown.slice(start + 1).search(/^## /mu)
    const end = next === -1 ? undefined : start + 1 + next
    return readmeMarkdown.slice(start, end).replace(`${heading}\n`, "").trim()
}

const sectionRoutes = new Map(
    publishedHeadings.flatMap((heading) => {
        const route = heading === "Rules" ? "rules-overview/" : `${headingAnchor(heading)}/`
        const subsectionRoutes = [...sourceSection(`## ${heading}`).matchAll(/^### (?<sub>.+)$/gmu)]
            .map(({ groups }) => headingAnchor(groups?.sub ?? ""))
            .map((anchor) => [anchor, `${route}#${anchor}`] as const)
        return [[headingAnchor(heading), route] as const, ...subsectionRoutes]
    }),
)

const expectedHref = (href: string) => {
    if (/^https?:/u.test(href)) return href
    const link = /^(?<file>[\w.-]+)?(?:#(?<anchor>[\w-]+))?$/u.exec(href)?.groups
    if (link?.file === "RULES.md") {
        return `${base}/${link.anchor === undefined ? "rules-overview/" : expectedRulesMdRoute(link.anchor)}`
    }
    if (link?.file !== undefined) return `${repositoryUrl}/blob/main/${href}`
    return `${base}/${sectionRoutes.get(link?.anchor ?? "") ?? "not-a-readme-section/"}`
}

const pageText = (body: string) => body.trim()
const sourceText = (section: string) =>
    withSubsectionsAtPageLevel(section).replace(
        markdownLink,
        (_link, href: string) => `](${expectedHref(href)})`,
    )

test("the real README introduction is the landing page with its text, links pointing to their page", () => {
    const [title = ""] = readmeMarkdown.split("\n")

    const landing = pages.find(({ kind }) => kind === "landing")

    const [tagline, ...rest] = sourceText(sourceSection(title)).split("\n\n")
    assert.ok(landing?.kind === "landing")
    assert.equal(landing.title, title.replace(/^# /u, ""))
    assert.equal(`${landing.scope ?? ""}${landing.name}`, landing.title)
    assert.equal(landing.tagline, tagline)
    assert.equal(pageText(landing.body), rest.join("\n\n"))
})

for (const heading of publishedHeadings) {
    test(`the real README section ${heading} is a page with its text, links pointing to their page`, () => {
        const page = readmePages.find(({ title }) => title === pageTitle(heading))

        assert.equal(pageText(page?.body ?? ""), sourceText(sourceSection(`## ${heading}`)))
    })
}

test("no page shows the Development section of the real README", () => {
    const blocks = sourceSection("## Development")
        .split("\n")
        .filter((line) => line.startsWith("- "))

    const shownBlocks = pages.flatMap((page) =>
        blocks.filter((block) => page.body.includes(block)).map((block) => `${page.id}: ${block}`),
    )

    assert.ok(blocks.length > 0)
    assert.deepEqual(shownBlocks, [])
})

const routeOf = (id: string) => (id === "index" ? `${base}/` : `${base}/${id}/`)

const pageHeadingAnchors = (body: string) =>
    [...body.matchAll(/^## (?<heading>.+)$/gmu)].map(({ groups }) =>
        headingAnchor(groups?.heading ?? ""),
    )

const readmeHrefs = () => [
    ...readmePages.flatMap(({ body }) => markdownLinkHrefs(body)),
    ...readmePages
        .flatMap((page) => (page.kind === "landing" ? page.actions : []))
        .map(({ link }) => link),
]

test("every internal link of the real README points to an existing site page and heading", () => {
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

test("every link of the real README to a repository file points to a file that exists", async () => {
    const fileHrefs = readmeHrefs().filter((href) => href.startsWith(`${repositoryUrl}/blob/main/`))

    assert.ok(fileHrefs.length > 0)
    for (const href of fileHrefs) {
        const file = new URL(href.replace(`${repositoryUrl}/blob/main/`, ""), repositoryRoot)
        await assert.doesNotReject(access(file), `${href} is not a repository file`)
    }
})
