import { type LinkRoutes, resolveLink, rewriteInternalLinks } from "./internalLinks.ts"
import { readmeMdSource } from "./readmeMdSource.ts"
import { rulesMdSource } from "./rulesMdSource.ts"
import { userGuideSource } from "./userGuideSource.ts"

export type SitePage =
    | { kind: "rule"; id: string; title: string; group: string; body: string }
    | { kind: "reference"; id: string; title: string; body: string }
    | { kind: "guide"; id: string; title: string; body: string }
    | {
          kind: "landing"
          id: string
          title: string
          scope: string | undefined
          name: string
          tagline: string
          body: string
          actions: LandingAction[]
      }

type LandingAction = { text: string; link: string }

export type SourcePage = { page: SitePage; file: string; location: string | undefined }

// `path` is relative to the user-guide directory
export type GuideFile = { path: string; content: string }

export type SiteSources = { rulesMd: string; readmeMd: string; userGuide: GuideFile[] }

export type SiteOptions = { base: string; repositoryUrl: string }

export const sitePages = ({ rulesMd, readmeMd, userGuide }: SiteSources, options: SiteOptions) => {
    const sources = [readmeMdSource(readmeMd), userGuideSource(userGuide), rulesMdSource(rulesMd)]
    const routes: LinkRoutes = new Map(sources.flatMap((source) => [...source.routes]))
    return sources
        .flatMap(({ sourcePages }) => sourcePages)
        .map(({ page, file, location }): SitePage => {
            const source = { ...options, file, location, routes }
            const body = rewriteInternalLinks(page.body, source)
            if (page.kind !== "landing") return { ...page, body }
            const actions = page.actions.map(({ text, link }) => ({
                text,
                link: resolveLink(link, source),
            }))
            return { ...page, body, actions }
        })
}
