import assert from "node:assert/strict"
import { access } from "node:fs/promises"
import { test } from "node:test"

import { headingAnchor, markdownLinkHrefs } from "./internalLinks.ts"
import { publishedSite } from "./publishedSite.ts"
import { readSiteSources } from "./readSiteSources.ts"
import { repositoryRoot } from "./realRulesMd.ts"
import { sitePages } from "./sitePages.ts"

const sources = await readSiteSources(new URL("website/", repositoryRoot))
const pages = sitePages(sources, publishedSite)
const { base, repositoryUrl } = publishedSite

const frontmatterTitle = (content: string) => /^title: (?<title>.+)$/mu.exec(content)?.groups?.title

const pageOf = (path: string) => pages.find(({ id }) => id === path.replace(/\.md$/u, ""))

test("the real user guide has guide files", () => {
    assert.ok(sources.userGuide.length > 0)
})

for (const { path, content } of sources.userGuide) {
    test(`the real guide file ${path} is a guide page with its frontmatter title`, () => {
        const page = pageOf(path)

        assert.equal(page?.kind, "guide")
        assert.equal(page?.title, frontmatterTitle(content))
    })
}

const guideHrefs = () =>
    sources.userGuide.flatMap(({ path }) => markdownLinkHrefs(pageOf(path)?.body ?? ""))

const pageHeadingAnchors = (body: string) =>
    [...body.matchAll(/^#{1,6} (?<heading>.+)$/gmu)].map(({ groups }) =>
        headingAnchor(groups?.heading ?? ""),
    )

const routeOf = (id: string) => (id === "index" ? `${base}/` : `${base}/${id}/`)

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
