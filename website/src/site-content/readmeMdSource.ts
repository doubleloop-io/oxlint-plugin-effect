import { headingAnchor, type LinkRoutes } from "./internalLinks.ts"
import type { SourcePage } from "./sitePages.ts"

type Section = { level: "#" | "##"; heading: string; subheadings: string[]; lines: string[] }

const file = "README.md"

const sectionHeading = /^(?<level>##?) (?<title>.+)$/u
const subsectionHeading = /^### (?<title>.+)$/u
const codeFence = /^```/u

// Addressed to the plugin maintainers, not to its users
const maintainerSections = new Set(["Development"])

// `rules` is the rules index from RULES.md
const renamedSections = new Map([["Rules", { id: "rules-overview", title: "Rules overview" }]])

const guidePage = (heading: string) =>
    renamedSections.get(heading) ?? { id: headingAnchor(heading), title: heading }

const landingActions = [
    { text: "Installation", link: "#installation" },
    { text: "Rules index", link: "RULES.md" },
]

export const readmeMdSource = (markdown: string) => {
    const readmeSections = sections(markdown).filter(
        ({ heading }) => !maintainerSections.has(heading),
    )
    const sourcePages = readmeSections.map(readmeMdPage)
    return { sourcePages, routes: linkRoutes(readmeSections) }
}

const readmeMdPage = ({ level, heading, lines }: Section): SourcePage => {
    const body = `${lines.join("\n").trim()}\n`
    return level === "#"
        ? {
              page: { kind: "landing", id: "index", title: heading, body, actions: landingActions },
              file,
              label: "introduction",
          }
        : {
              page: { kind: "guide", ...guidePage(heading), body },
              file,
              label: `section \`${heading}\``,
          }
}

const linkRoutes = (readmeSections: Section[]): LinkRoutes =>
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
    let insideCodeBlock = false
    for (const line of markdown.split("\n")) {
        if (codeFence.test(line)) insideCodeBlock = !insideCodeBlock
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
