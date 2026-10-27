// Keyed by `<source file>#<anchor>`, so one source can link into another (README → RULES.md)
export type LinkRoutes = Map<string, string>

export type LinkSource = {
    file: string
    section: string
    base: string
    routes: LinkRoutes
}

const codeFence = /^```/u
const markdownLink = /\]\((?<href>[^)\s]+)\)/gu
const internalHref = /^(?<file>[\w./-]+\.md)?#(?<anchor>[\w-]+)$/u

export const headingAnchor = (heading: string) =>
    heading
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s/gu, "-")

export const rewriteInternalLinks = (body: string, source: LinkSource) => {
    let insideCodeBlock = false
    return body
        .split("\n")
        .map((line) => {
            if (codeFence.test(line)) insideCodeBlock = !insideCodeBlock
            if (insideCodeBlock) return line
            return line.replace(markdownLink, (link, href: string) => {
                const target = internalHref.exec(href)?.groups
                if (target?.anchor === undefined) return link
                const route = source.routes.get(`${target.file ?? source.file}#${target.anchor}`)
                if (route === undefined) {
                    throw new Error(
                        `${source.file}, ${source.section}: link \`${href}\` resolves to no site page`,
                    )
                }
                return `](${source.base.replace(/\/$/u, "")}/${route})`
            })
        })
        .join("\n")
}
