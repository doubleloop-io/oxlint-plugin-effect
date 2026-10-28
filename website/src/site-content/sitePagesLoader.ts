import type { Loader } from "astro/loaders"

import { publishedSite } from "./publishedSite.ts"
import { readSiteSources } from "./readSiteSources.ts"
import { type SitePage, sitePages } from "./sitePages.ts"

export const sitePagesLoader = (): Loader => ({
    name: "site-pages",
    load: async ({ config, store, parseData, renderMarkdown }) => {
        const sources = await readSiteSources(config.root)
        store.clear()
        for (const page of sitePages(sources, { ...publishedSite, base: config.base })) {
            const hero =
                page.kind === "landing"
                    ? { title: heroTitle(page), tagline: escapeHtml(page.tagline), actions: page.actions }
                    : undefined
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

type LandingPage = Extract<SitePage, { kind: "landing" }>

// Starlight renders the hero title and tagline as HTML
const heroTitle = ({ scope, name }: LandingPage) =>
    [scope === undefined ? "" : `<span class="hero-scope">${escapeHtml(scope)}</span>`, escapeHtml(name)].join("")

const escapeHtml = (text: string) =>
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
