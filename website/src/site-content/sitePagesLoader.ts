import type { Loader } from "astro/loaders"

import { readRulesMarkdown } from "./readRulesMarkdown.ts"
import { sitePages } from "./sitePages.ts"

export const sitePagesLoader = (): Loader => ({
    name: "site-pages",
    load: async ({ config, store, parseData, renderMarkdown }) => {
        const markdown = await readRulesMarkdown(config.root)
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
