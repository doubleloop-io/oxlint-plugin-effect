import type { Loader } from "astro/loaders"

import { readSiteSources } from "./readSiteSources.ts"
import { repository } from "./repository.ts"
import { sitePages } from "./sitePages.ts"

export const sitePagesLoader = (): Loader => ({
    name: "site-pages",
    load: async ({ config, store, parseData, renderMarkdown }) => {
        const sources = await readSiteSources(config.root)
        store.clear()
        for (const page of sitePages(sources, { base: config.base, repository })) {
            const hero = page.kind === "landing" ? { actions: page.actions } : undefined
            const data = await parseData({ id: page.id, data: { title: page.title, hero } })
            store.set({
                id: page.id,
                data,
                body: page.body,
                rendered: await renderMarkdown(page.body),
            })
        }
    },
})
