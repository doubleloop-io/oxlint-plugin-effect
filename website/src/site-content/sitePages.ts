import { type LinkRoutes, resolveLink, rewriteInternalLinks } from "./internalLinks.ts"
import { userGuideSource } from "./userGuideSource.ts"

export type SitePage =
    | { kind: "rule"; id: string; title: string; group: string; body: string }
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

export type SourcePage = { page: SitePage; file: string }

// `path` is relative to the user-guide directory
export type GuideFile = { path: string; content: string }

export type SiteSources = { userGuide: GuideFile[] }

export type SiteOptions = { base: string; repositoryUrl: string }

export const sitePages = ({ userGuide }: SiteSources, options: SiteOptions) => {
    const { sourcePages, routes } = userGuideSource(userGuide)
    return sourcePages.map(({ page, file }): SitePage => {
            const source = { ...options, file, routes }
            const body = rewriteInternalLinks(page.body, source)
            if (page.kind !== "landing") return { ...page, body }
            const actions = page.actions.map(({ text, link }) => ({
                text,
                link: resolveLink(link, source),
            }))
            return { ...page, body, actions }
        })
}
