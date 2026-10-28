import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import { test } from "node:test"

import { headingAnchor, markdownLinkHrefs } from "./internalLinks.ts"
import { publishedSite, siteOrigin } from "./publishedSite.ts"
import { readSiteSources } from "./readSiteSources.ts"
import { repositoryRoot } from "./realRepository.ts"
import { sitePages } from "./sitePages.ts"

// The README is no site page: it reaches the guide through absolute URLs, which work on npmjs.com
const readmeHrefs = markdownLinkHrefs(await readFile(new URL("README.md", repositoryRoot), "utf8"))

const pages = sitePages(await readSiteSources(new URL("website/", repositoryRoot)), publishedSite)
const { base, repositoryUrl } = publishedSite
const websiteUrl = `${siteOrigin}${base}/`
const repositoryFileUrl = `${repositoryUrl}/blob/main/`

const routeOf = (id: string) => (id === "index" ? `${base}/` : `${base}/${id}/`)

const pageHeadingAnchors = (body: string) =>
    [...body.matchAll(/^#{1,6} (?<heading>.+)$/gmu)].map(({ groups }) =>
        headingAnchor(groups?.heading ?? ""),
    )

test("every link of the real README is an absolute URL to the website or to a repository file", () => {
    const otherHrefs = readmeHrefs.filter(
        (href) => !href.startsWith(websiteUrl) && !href.startsWith(repositoryFileUrl),
    )

    assert.ok(readmeHrefs.length > 0)
    assert.deepEqual(otherHrefs, [])
})

test("every link of the real README to the website points to an existing site page and heading", () => {
    const websiteHrefs = readmeHrefs.filter((href) => href.startsWith(websiteUrl))

    assert.ok(websiteHrefs.length > 0)
    for (const href of websiteHrefs) {
        const [route, anchor] = href.replace(siteOrigin, "").split("#")
        const target = pages.find(({ id }) => routeOf(id) === route)
        assert.ok(target, `${href} is not a site page`)
        if (anchor !== undefined) {
            assert.ok(pageHeadingAnchors(target.body).includes(anchor), `${href} has no heading`)
        }
    }
})

test("every link of the real README to a repository file points to a file that exists", async () => {
    const fileHrefs = readmeHrefs.filter((href) => href.startsWith(repositoryFileUrl))

    for (const href of fileHrefs) {
        const file = new URL(href.replace(repositoryFileUrl, ""), repositoryRoot)
        await assert.doesNotReject(access(file), `${href} is not a repository file`)
    }
})
