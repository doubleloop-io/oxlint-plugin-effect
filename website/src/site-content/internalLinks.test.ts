import assert from "node:assert/strict"
import { test } from "node:test"

import { type LinkSource, rewriteInternalLinks } from "./internalLinks.ts"
import { testSite } from "./sourceMarkdownBuilders.ts"

const linkSource = (routes: Record<string, string>): LinkSource => ({
    ...testSite,
    file: "user-guide/shared-settings.md",
    routes: new Map(Object.entries(routes)),
})

test("an anchor link points to its route under the base, also when the link names its file", () => {
    const source = linkSource({ "user-guide/shared-settings.md#defaults": "shared-settings/#defaults" })

    const body = rewriteInternalLinks("[a](#defaults), [b](shared-settings.md#defaults)", source)

    assert.equal(body, "[a](/site/shared-settings/#defaults), [b](/site/shared-settings/#defaults)")
})

test("links to the web and link-like text in a code block are left as they are", () => {
    const body =
        "```ts\nconst x = a[0](#nowhere)\n```\n\nSee [Effect](https://effect.website/docs#errors)."

    const rewritten = rewriteInternalLinks(body, linkSource({}))

    assert.equal(rewritten, body)
})

test("a link to a repository file with no site page points to the file on the main branch", () => {
    const body = rewriteInternalLinks("See [the license](../LICENSE.anti-slop).", linkSource({}))

    assert.equal(body, `See [the license](${testSite.repositoryUrl}/blob/main/LICENSE.anti-slop).`)
})
