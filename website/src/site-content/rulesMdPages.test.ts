import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import { sitePages } from "./sitePages.ts"

const rulesMdUrl = new URL("../../../RULES.md", import.meta.url)

const ruleHeadingWithBackLink =
    /^### `([a-z-]+)`\n\n<sup>\[↑ rules index\]\(#rules-index\)<\/sup>$/gmu

test("the site has exactly one page per rule section of RULES.md", async () => {
    const rulesMarkdown = await readFile(rulesMdUrl, "utf8")
    const documentedRules = [...rulesMarkdown.matchAll(ruleHeadingWithBackLink)].map(
        ([, rule]) => `rules/${rule}`,
    )

    const pageIds = sitePages(rulesMarkdown).map(({ id }) => id)

    assert.deepEqual(pageIds, documentedRules)
})
