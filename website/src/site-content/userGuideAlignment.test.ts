import assert from "node:assert/strict"
import { access } from "node:fs/promises"
import { test } from "node:test"

import { markdownLinkHrefs } from "./internalLinks.ts"
import { publishedSite } from "./publishedSite.ts"
import { readSiteSources } from "./readSiteSources.ts"
import { repositoryRoot } from "./realRepository.ts"
import { pageHeadingAnchors, routeOf } from "./siteLinkTargets.ts"
import { sitePages } from "./sitePages.ts"

const sources = await readSiteSources(new URL("website/", repositoryRoot))
const pages = sitePages(sources, publishedSite)
const { base, repositoryUrl } = publishedSite

const frontmatterTitle = (content: string) =>
    /^title: "?(?<title>.+?)"?$/mu.exec(content)?.groups?.title

// The guide index is the landing page and the rules index the rules overview, stated apart from
// how the site derives them
const expectedPageIds = new Map([
    ["README.md", "index"],
    ["rules.md", "rules-overview"],
])

const pageOf = (path: string) =>
    pages.find(({ id }) => id === (expectedPageIds.get(path) ?? path.replace(/\.md$/u, "")))

test("the real user guide has guide files", () => {
    assert.ok(sources.userGuide.length > 0)
})

const isRuleFile = (path: string) => path.startsWith("rules/")

for (const { path, content } of sources.userGuide.filter(
    ({ path }) => path !== "README.md" && !isRuleFile(path),
)) {
    test(`the real guide file ${path} is a guide page with its frontmatter title`, () => {
        const page = pageOf(path)

        assert.equal(page?.kind, "guide")
        assert.equal(page?.title, frontmatterTitle(content))
    })
}

test("every real rule file is a rule page named after its file", () => {
    const ruleFileNames = sources.userGuide
        .filter(({ path }) => isRuleFile(path))
        .map(({ path }) => path.replace(/^rules\/(?<name>.+)\.md$/u, "$<name>"))
        .toSorted()

    const rulePageTitles = pages
        .filter(({ kind }) => kind === "rule")
        .map(({ title }) => title)
        .toSorted()

    assert.ok(ruleFileNames.length > 0)
    assert.deepEqual(rulePageTitles, ruleFileNames)
})

const rulesIndexRow = /^\| (?<topic>[^|]+?) +\| (?<rules>.+) \|$/gmu
const ruleLink = /\]\(rules\/(?<rule>[a-z-]+)\.md\)/gu

// The topic table comes first in the rules index, before any other table that links rules
const rulesIndexTopics = () => {
    const rulesIndex = sources.userGuide.find(({ path }) => path === "rules.md")?.content ?? ""
    const topicTable = rulesIndex.split("\n\n").find((block) => block.startsWith("| Topic"))
    return [...(topicTable ?? "").matchAll(rulesIndexRow)].flatMap(({ groups }) =>
        [...(groups?.rules ?? "").matchAll(ruleLink)].map((link) => ({
            id: `rules/${link.groups?.rule}`,
            group: groups?.topic ?? "",
        })),
    )
}

test("real rule pages sit in the group of their topic in the rules index, in its order", () => {
    const rulePages = pages.flatMap((page) =>
        page.kind === "rule" ? [{ id: page.id, group: page.group }] : [],
    )

    assert.deepEqual(rulePages, rulesIndexTopics())
})

test("the real guide index is the landing page, with the package scope above its name and its first paragraph as tagline", () => {
    const landing = pageOf("README.md")

    assert.ok(landing?.kind === "landing")
    assert.equal(landing.scope, "@doubleloop-io/")
    assert.equal(landing.name, "oxlint-plugin-effect")
    assert.equal(landing.tagline, "An oxlint plugin that enforces a catalog of patterns for Effect 4 code.")
    assert.deepEqual(
        landing.actions.map(({ text }) => text),
        ["Installation", "Rules overview"],
    )
})

// Rule pages are reached through the rules index, which the build already requires to link them
test("the real guide index links to every guide page", () => {
    const indexHrefs = markdownLinkHrefs(pageOf("README.md")?.body ?? "")
    const unlinked = sources.userGuide
        .filter(({ path }) => path !== "README.md" && !isRuleFile(path))
        .map(({ path }) => pageOf(path)?.id ?? path)
        .filter((id) => !indexHrefs.includes(routeOf(id)))

    assert.deepEqual(unlinked, [])
})

const guideHrefs = () =>
    sources.userGuide.flatMap(({ path }) => {
        const page = pageOf(path)
        const actionLinks = page?.kind === "landing" ? page.actions.map(({ link }) => link) : []
        return [...markdownLinkHrefs(page?.body ?? ""), ...actionLinks]
    })

test("every internal link of the real user guide points to an existing site page and heading", () => {
    for (const href of guideHrefs().filter((link) => link.startsWith(`${base}/`))) {
        const [route, anchor] = href.split("#")
        const target = pages.find(({ id }) => routeOf(id) === route)
        assert.ok(target, `${href} is not a site page`)
        if (anchor !== undefined) {
            assert.ok(pageHeadingAnchors(target.body).includes(anchor), `${href} has no heading`)
        }
    }
})

test("every link of the real user guide to a repository file points to a file that exists", async () => {
    const fileHrefs = guideHrefs().filter((href) => href.startsWith(`${repositoryUrl}/blob/main/`))

    for (const href of fileHrefs) {
        const file = new URL(href.replace(`${repositoryUrl}/blob/main/`, ""), repositoryRoot)
        await assert.doesNotReject(access(file), `${href} is not a repository file`)
    }
})
