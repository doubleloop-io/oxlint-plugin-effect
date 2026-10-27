import { markdownLines } from "./markdownLines.ts"
import type { SiteOptions } from "./sitePages.ts"

// Keyed by `<source file>#<anchor>`, or by `<source file>` for the file itself, so one source can
// link into another (README → RULES.md)
export type LinkRoutes = Map<string, string>

export type LinkSource = SiteOptions & {
    file: string
    location: string
    routes: LinkRoutes
}

export const markdownLink = /\]\((?<href>[^)\s]+)\)/gu
const internalHref = /^(?<file>[\w./-]+\.md)?(?:#(?<anchor>[\w-]+))?$/u
const repositoryFileHref = /^[\w.-][\w./-]*$/u

export const markdownLinkHrefs = (text: string) =>
    [...text.matchAll(markdownLink)].map(({ groups }) => groups?.href ?? "")

export const headingAnchor = (heading: string) =>
    heading
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s/gu, "-")

export const resolveLink = (href: string, source: LinkSource) => {
    const target = internalHref.exec(href)?.groups
    if (target === undefined) {
        return repositoryFileHref.test(href) ? `${source.repositoryUrl}/blob/main/${href}` : href
    }
    const { file = source.file, anchor } = target
    const route = source.routes.get(anchor === undefined ? file : `${file}#${anchor}`)
    if (route === undefined) {
        throw new Error(
            `${source.file}, ${source.location}: link \`${href}\` resolves to no site page`,
        )
    }
    return `${source.base.replace(/\/$/u, "")}/${route}`
}

export const rewriteInternalLinks = (body: string, source: LinkSource) =>
    markdownLines(body.split("\n"))
        .map(({ line, insideCodeBlock }) =>
            insideCodeBlock
                ? line
                : line.replace(
                      markdownLink,
                      (_link, href: string) => `](${resolveLink(href, source)})`,
                  ),
        )
        .join("\n")
