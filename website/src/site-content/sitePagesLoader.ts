import { readFile } from "node:fs/promises"

import type { Loader } from "astro/loaders"

import { sitePages } from "./sitePages.ts"

const sourcePath = "src/site-content/demo.md"

export const sitePagesLoader = (): Loader => ({
    name: "site-pages",
    load: async ({ config, store, parseData, renderMarkdown }) => {
        const markdown = await readFile(new URL(sourcePath, config.root), "utf8")
        store.clear()
        for (const page of sitePages(markdown)) {
            const data = await parseData({ id: page.id, data: { title: page.title } })
            store.set({
                id: page.id,
                data,
                body: page.body,
                rendered: await renderMarkdown(page.body),
            })
        }
    },
})
