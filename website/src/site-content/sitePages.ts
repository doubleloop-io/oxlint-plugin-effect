import { type LinkRoutes, resolveLink, rewriteInternalLinks } from "./internalLinks.ts"
import { readmeMdSource } from "./readmeMdSource.ts"
import { rulesMdSource } from "./rulesMdSource.ts"

export type SitePage =
    | { kind: "rule"; id: string; title: string; group: string; body: string }
    | { kind: "reference"; id: string; title: string; body: string }
    | { kind: "guide"; id: string; title: string; body: string }
    | { kind: "landing"; id: string; title: string; body: string; actions: LandingAction[] }

type LandingAction = { text: string; link: string }

export type SourcePage = { page: SitePage; file: string; label: string }

export type SiteSources = { rulesMd: string; readmeMd: string }

// `repository` is the GitHub URL, for links to repository files that have no site page
type SiteOptions = { base: string; repository: string }

export const sitePages = (
    { rulesMd, readmeMd }: SiteSources,
    { base, repository }: SiteOptions,
) => {
    const sources = [readmeMdSource(readmeMd), rulesMdSource(rulesMd)]
    const routes: LinkRoutes = new Map(sources.flatMap((source) => [...source.routes]))
    return sources
        .flatMap(({ sourcePages }) => sourcePages)
        .map(({ page, file, label }): SitePage => {
            const source = { file, section: label, base, repository, routes }
            const body = rewriteInternalLinks(page.body, source)
            if (page.kind !== "landing") return { ...page, body }
            const actions = page.actions.map(({ text, link }) => ({
                text,
                link: resolveLink(link, source),
            }))
            return { ...page, body, actions }
        })
}
