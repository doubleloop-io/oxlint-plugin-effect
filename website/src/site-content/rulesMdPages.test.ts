import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import { sitePages } from "./sitePages.ts"

const rulesMdUrl = new URL("../../../RULES.md", import.meta.url)
const rulesMarkdown = await readFile(rulesMdUrl, "utf8")

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

const sourceSection = (rule: string) => {
    const start = rulesMarkdown.indexOf(`### \`${rule}\`\n`)
    const next = rulesMarkdown.slice(start + 1).search(/^##+ /mu)
    return rulesMarkdown.slice(start, next === -1 ? undefined : start + 1 + next)
}

test("the site has exactly one page per rule section of RULES.md", () => {
    const documentedRules = [...rulesMarkdown.matchAll(ruleHeadingWithBackLink)].map(
        ([, rule]) => `rules/${rule}`,
    )

    const pageIds = sitePages(rulesMarkdown).map(({ id }) => id)

    assert.deepEqual(pageIds, documentedRules)
})

test("rule pages sit in the group of their section, in the order of the rules index", () => {
    const pages = sitePages(rulesMarkdown)

    assert.deepEqual(
        pages.map(({ id, group }) => ({ id, group })),
        rulesIndex(),
    )
})

test("every block of a rule section is on its page with its text, except the back link", () => {
    for (const page of sitePages(rulesMarkdown)) {
        const blocks = sourceSection(page.title)
            .split("\n\n")
            .slice(1)
            .map((block) => block.trim())
            .filter((block) => block !== backLink && block !== "")

        for (const block of blocks) assert.ok(page.body.includes(block), `${page.id}: ${block}`)
        assert.ok(!page.body.includes(backLink), `${page.id} shows the back link`)
    }
})
