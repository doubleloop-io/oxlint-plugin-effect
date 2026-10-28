import { headingAnchor } from "./internalLinks.ts"
import { markdownLines } from "./markdownLines.ts"
import type { SitePage, SourcePage } from "./sitePages.ts"

type Section = { level: "#" | "##"; heading: string; subheadings: string[]; lines: string[] }

const file = "README.md"

const sectionHeading = /^(?<level>##?) (?<title>.+)$/u
const subsectionHeading = /^### (?<title>.+)$/u

// Addressed to the plugin maintainers, not to its users
export const maintainerSections = new Set(["Development"])

export const rulesOverviewId = "rules-overview"

// `rules/` is the parent route of the rule pages
export const renamedSections = new Map([["Rules", { id: rulesOverviewId, title: "Rules overview" }]])

const guidePage = (heading: string) =>
    renamedSections.get(heading) ?? { id: headingAnchor(heading), title: heading }

const landingActions = [
    { text: "Installation", link: "#installation" },
    { text: "Rules overview", link: "RULES.md" },
]

export const readmeMdSource = (markdown: string) => {
    const readmeSections = sections(markdown).filter(
        ({ heading }) => !maintainerSections.has(heading),
    )
    const sourcePages = readmeSections.map(readmeMdPage)
    return { sourcePages, routes: linkRoutes(readmeSections) }
}

const packageName = /^(?<scope>@[^/]+\/)?(?<name>.+)$/u

const readmeMdPage = ({ level, heading, lines }: Section): SourcePage => {
    const body = `${lines.join("\n").trim()}\n`
    return level === "#"
        ? { page: landingPage(heading, body), file, location: "introduction" }
        : {
              page: { kind: "guide", ...guidePage(heading), body },
              file,
              location: `section \`${heading}\``,
          }
}

// The heading is the package name, split so the scope can sit above the name;
// the first paragraph is the tagline under it, so the body starts after it
const landingPage = (heading: string, introduction: string): SitePage => {
    const { scope, name = heading } = packageName.exec(heading)?.groups ?? {}
    const [tagline = "", ...rest] = introduction.split("\n\n")
    const body = rest.length === 0 ? "" : `${rest.join("\n\n").trim()}\n`
    return { kind: "landing", id: "index", title: heading, scope, name, tagline: tagline.trim(), body, actions: landingActions }
}

const linkRoutes = (readmeSections: Section[]) =>
    new Map(
        readmeSections
            .filter(({ level }) => level === "##")
            .flatMap(({ heading, subheadings }) => {
                const route = `${guidePage(heading).id}/`
                return [
                    [`${file}#${headingAnchor(heading)}`, route] as const,
                    ...subheadings.map(
                        (subheading) =>
                            [
                                `${file}#${headingAnchor(subheading)}`,
                                `${route}#${headingAnchor(subheading)}`,
                            ] as const,
                    ),
                ]
            }),
    )

// A section is a page whose title is the `##` heading, so its `###` subsections become `##`
const sections = (markdown: string) => {
    const found: Section[] = []
    let current: Section | undefined
    for (const { line, insideCodeBlock } of markdownLines(markdown.split("\n"))) {
        const heading = insideCodeBlock ? undefined : sectionHeading.exec(line)?.groups
        const subheading = insideCodeBlock ? undefined : subsectionHeading.exec(line)?.groups?.title
        if (heading?.title !== undefined) {
            const level = heading.level === "#" ? "#" : "##"
            current = { level, heading: heading.title, subheadings: [], lines: [] }
            found.push(current)
        } else if (subheading !== undefined) {
            current?.subheadings.push(subheading)
            current?.lines.push(`## ${subheading}`)
        } else {
            current?.lines.push(line)
        }
    }
    return found
}
