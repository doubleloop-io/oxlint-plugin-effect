import assert from "node:assert/strict"
import { test } from "node:test"

import { sitePages } from "./sitePages.ts"

test("a Markdown document becomes one page titled by its heading, with the rest as body", () => {
    const markdown = "# Getting started\n\nInstall the plugin.\n\n## Next\n\nConfigure it.\n"

    const pages = sitePages(markdown)

    assert.deepEqual(pages, [
        {
            id: "getting-started",
            title: "Getting started",
            body: "Install the plugin.\n\n## Next\n\nConfigure it.\n",
        },
    ])
})

test("a Markdown document without a leading title heading fails", () => {
    const markdown = "Install the plugin.\n"

    assert.throws(() => sitePages(markdown), /must start with a `# ` title heading/u)
})
