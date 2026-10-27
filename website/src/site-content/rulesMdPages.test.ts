import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import { publishedSite } from "./publishedSite.ts"
import { sitePages } from "./sitePages.ts"

const rulesMdUrl = new URL("../../../RULES.md", import.meta.url)
const rulesMarkdown = await readFile(rulesMdUrl, "utf8")
const readmeMarkdown = await readFile(new URL("../../../README.md", import.meta.url), "utf8")

const backLink = "<sup>[↑ rules index](#rules-index)</sup>"
const ruleHeadingWithBackLink =
    /^### `([a-z-]+)`\n\n<sup>\[↑ rules index\]\(#rules-index\)<\/sup>$/gmu
const rulesIndexRow = /^\| (?:\[(?<group>[^\]]+)\]\(#[a-z-]+\))? +\| \[`(?<rule>[a-z-]+)`\]/gmu

const rulesIndex = () => {
    let group = ""
    return [...rulesMarkdown.matchAll(rulesIndexRow)].map((row) => {
        group = row.groups?.group ?? group
        return { id: `rules/${row.groups?.rule}`, group }
    })
}

const { base, repositoryUrl } = publishedSite
const pages = sitePages({ rulesMd: rulesMarkdown, readmeMd: readmeMarkdown }, publishedSite)
const rulePages = () => pages.filter((page) => page.kind === "rule")

const linkTarget = /\]\((?<href>[^)\s]+)\)/gu
const withoutLinkTargets = (text: string) => text.replace(linkTarget, "](…)")

const sourceSection = (heading: string) => {
    const start = rulesMarkdown.indexOf(`${heading}\n`)
    const next = rulesMarkdown.slice(start + 1).search(/^##+ /mu)
    return rulesMarkdown.slice(start, next === -1 ? undefined : start + 1 + next)
}

test("the site has exactly one page per rule section of RULES.md", () => {
    const documentedRules = [...rulesMarkdown.matchAll(ruleHeadingWithBackLink)].map(
        ([, rule]) => `rules/${rule}`,
    )

    const pageIds = rulePages().map(({ id }) => id)

    assert.deepEqual(pageIds, documentedRules)
})

test("rule pages sit in the group of their section, in the order of the rules index", () => {
    const pages = rulePages()

    assert.deepEqual(
        pages.map(({ id, group }) => ({ id, group })),
        rulesIndex(),
    )
})

test("every block of a rule section is on its page with its text, except back link and link targets", () => {
    for (const page of rulePages()) {
        const blocks = sourceSection(`### \`${page.title}\``)
            .split("\n\n")
            .slice(1)
            .map((block) => block.trim())
            .filter((block) => block !== backLink && block !== "")

        for (const block of blocks) {
            assert.ok(
                withoutLinkTargets(page.body).includes(withoutLinkTargets(block)),
                `${page.id}: ${block}`,
            )
        }
        assert.ok(!page.body.includes(backLink), `${page.id} shows the back link`)
    }
})

for (const heading of ["Rules index", "Common limits", "Shared settings"]) {
    test(`${heading} is a page with the text of its section, except link targets`, () => {
        const source = sourceSection(`## ${heading}`).replace(`## ${heading}\n`, "").trim()

        const page = pages.find(({ title }) => title === heading)

        assert.equal(withoutLinkTargets(page?.body.trim() ?? ""), withoutLinkTargets(source))
    })
}

test("every link between sections of RULES.md points to an existing site page", () => {
    const routes = new Set(pages.map(({ id }) => `${base}/${id}/`))

    const rulesMdPages = pages.filter(({ kind }) => kind === "rule" || kind === "reference")
    const hrefs = rulesMdPages.flatMap(({ body }) =>
        [...body.matchAll(linkTarget)].map(({ groups }) => groups?.href ?? ""),
    )

    const internalHrefs = hrefs.filter((href) => !/^https?:/u.test(href))
    assert.ok(internalHrefs.length > 0)
    for (const href of internalHrefs) assert.ok(routes.has(href), `${href} is not a site page`)
})
