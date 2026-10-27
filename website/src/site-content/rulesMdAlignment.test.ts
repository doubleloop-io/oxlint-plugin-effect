import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import { test } from "node:test"

import { markdownLink, markdownLinkHrefs } from "./internalLinks.ts"
import { publishedSite } from "./publishedSite.ts"
import {
    expectedRulesMdRoute,
    repositoryRoot,
    rulesIndexRow,
    rulesMarkdown,
} from "./realRulesMd.ts"
import { backLink } from "./rulesMdSource.ts"
import { sitePages } from "./sitePages.ts"

const readmeMarkdown = await readFile(new URL("README.md", repositoryRoot), "utf8")

const { base, repositoryUrl } = publishedSite
const pages = sitePages({ rulesMd: rulesMarkdown, readmeMd: readmeMarkdown }, publishedSite)
const rulePages = () => pages.filter((page) => page.kind === "rule")
const rulesMdPages = () => pages.filter(({ kind }) => kind === "rule" || kind === "reference")

const ruleHeadingAndNextLine = /^### `(?<rule>[a-z-]+)`\n\n(?<nextLine>.*)$/gmu

const rulesIndex = () => {
    let group = ""
    return [...rulesMarkdown.matchAll(rulesIndexRow)].map((row) => {
        group = row.groups?.group ?? group
        return { id: `rules/${row.groups?.rule}`, group }
    })
}

const expectedHref = (href: string) => {
    const anchor = /^#(?<anchor>[a-z-]+)$/u.exec(href)?.groups?.anchor
    if (anchor !== undefined) return `${base}/${expectedRulesMdRoute(anchor)}`
    return /^https?:/u.test(href) ? href : `${repositoryUrl}/blob/main/${href}`
}

const withExpectedHrefs = (text: string) =>
    text.replace(markdownLink, (_link, href: string) => `](${expectedHref(href)})`)

const sourceSection = (heading: string) => {
    const start = rulesMarkdown.indexOf(`${heading}\n`)
    const next = rulesMarkdown.slice(start + 1).search(/^##+ /mu)
    return rulesMarkdown.slice(start, next === -1 ? undefined : start + 1 + next)
}

test("the site has exactly one page per rule section of the real RULES.md", () => {
    const documentedRules = [...rulesMarkdown.matchAll(ruleHeadingAndNextLine)]
        .filter(({ groups }) => groups?.nextLine === backLink)
        .map(({ groups }) => `rules/${groups?.rule}`)

    const pageIds = rulePages().map(({ id }) => id)

    assert.deepEqual(pageIds, documentedRules)
})

test("rule pages sit in the group of their section, in the order of the real rules index", () => {
    const pages = rulePages()

    assert.deepEqual(
        pages.map(({ id, group }) => ({ id, group })),
        rulesIndex(),
    )
})

test("every block of a real RULES.md rule section is on its page, links pointing to the page of their anchor", () => {
    for (const page of rulePages()) {
        const blocks = sourceSection(`### \`${page.title}\``)
            .split("\n\n")
            .slice(1)
            .map((block) => block.trim())
            .filter((block) => block !== backLink && block !== "")

        for (const block of blocks) {
            assert.ok(page.body.includes(withExpectedHrefs(block)), `${page.id}: ${block}`)
        }
        assert.ok(!page.body.includes(backLink), `${page.id} shows the back link`)
    }
})

for (const heading of ["Rules index", "Common limits", "Shared settings"]) {
    test(`${heading} is a page with the text of its real RULES.md section, links pointing to the page of their anchor`, () => {
        const source = sourceSection(`## ${heading}`).replace(`## ${heading}\n`, "").trim()

        const page = pages.find(({ title }) => title === heading)

        assert.equal(page?.body.trim(), withExpectedHrefs(source))
    })
}

test("every link between sections of the real RULES.md points to an existing site page", () => {
    const routes = new Set(pages.map(({ id }) => `${base}/${id}/`))

    const hrefs = rulesMdPages().flatMap(({ body }) => markdownLinkHrefs(body))

    const sitePageHrefs = hrefs.filter((href) => href.startsWith(`${base}/`))
    assert.ok(sitePageHrefs.length > 0)
    for (const href of sitePageHrefs) assert.ok(routes.has(href), `${href} is not a site page`)
})

// RULES.md links to no repository file today, so this guards the links it may gain
test("every link of the real RULES.md to a repository file points to a file that exists", async () => {
    const fileHrefs = rulesMdPages()
        .flatMap(({ body }) => markdownLinkHrefs(body))
        .filter((href) => href.startsWith(`${repositoryUrl}/blob/main/`))

    for (const href of fileHrefs) {
        const file = new URL(href.replace(`${repositoryUrl}/blob/main/`, ""), repositoryRoot)
        await assert.doesNotReject(access(file), `${href} is not a repository file`)
    }
})
