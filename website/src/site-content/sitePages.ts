import { headingAnchor, type LinkRoutes, rewriteInternalLinks } from "./internalLinks.ts"

export type SitePage =
    | { kind: "rule"; id: string; title: string; group: string; body: string }
    | { kind: "reference"; id: string; title: string; body: string }

type Section = {
    heading: string
    group: string
    lines: string[]
}

type RuleSection = Section & { name: string }

const referencePageIds = new Map([
    ["Rules index", "rules"],
    ["Common limits", "common-limits"],
    ["Shared settings", "shared-settings"],
])

const sectionHeading = /^(?<level>#{1,3}) (?<title>.+)$/u
const ruleHeading = /^`(?<name>[a-z-]+)`$/u
const codeFence = /^```/u
const backLink = /^<sup>\[↑ rules index\]\(#rules-index\)<\/sup>$/u

const requiredFields = ["Intent", "Trigger", "Options", "Fix"]
const fieldLabel = /^\*\*(?<label>[^*]+)\*\*:/u

export const sitePages = (rulesMarkdown: string, { base }: { base: string }) => {
    const allSections = sections(rulesMarkdown)
    const sourcePages = allSections.flatMap(sourcePage)
    const routes = linkRoutes(allSections, sourcePages)
    return sourcePages.map(({ page, label }) => ({
        ...page,
        body: rewriteInternalLinks(page.body, { file: "RULES.md", section: label, base, routes }),
    }))
}

type SourcePage = { page: SitePage; heading: string; label: string }

const sourcePage = (section: Section): SourcePage[] => {
    const { heading } = section
    const name = ruleHeading.exec(heading)?.groups?.name
    if (name !== undefined) {
        return [{ page: rulePage({ ...section, name }), heading, label: `rule \`${name}\`` }]
    }
    const id = referencePageIds.get(heading)
    if (id === undefined) return []
    const page: SitePage = { kind: "reference", id, title: heading, body: body(section) }
    return [{ page, heading, label: `section \`${heading}\`` }]
}

// A group has no page: its anchor leads to its first rule, as its heading does in RULES.md
const linkRoutes = (allSections: Section[], sourcePages: SourcePage[]): LinkRoutes =>
    new Map(
        allSections.flatMap(({ heading }) => {
            const target =
                sourcePages.find((source) => source.heading === heading)?.page ??
                sourcePages.find(({ page }) => page.kind === "rule" && page.group === heading)?.page
            return target === undefined
                ? []
                : [[`RULES.md#${headingAnchor(heading)}`, `${target.id}/`]]
        }),
    )

const rulePage = (section: RuleSection): SitePage => {
    assertFollowsCatalogTemplate(section)
    return {
        kind: "rule",
        id: `rules/${section.name}`,
        title: section.name,
        group: section.group,
        body: body(section),
    }
}

const body = ({ lines }: Section) => `${lines.join("\n").trim()}\n`

const assertFollowsCatalogTemplate = ({ name, lines }: RuleSection) => {
    const problem = templateProblem(lines)
    if (problem !== undefined) throw new Error(`RULES.md, rule \`${name}\`: ${problem}`)
}

const templateProblem = (lines: string[]) => {
    const prose = proseLines(lines)
    const fields = new Map(
        prose.flatMap((line, index) => {
            const label = fieldLabel.exec(line)?.groups?.label
            const value = line.replace(fieldLabel, "").trim()
            return label === undefined ? [] : [[label, { value, index }] as const]
        }),
    )
    const missing = requiredFields.find((field) => !fields.has(field))
    if (missing !== undefined) return `missing **${missing}**`

    if (!fixValue.test(fields.get("Fix")?.value ?? "")) {
        return "**Fix** is not none, autofix or suggestion"
    }
    const options = fields.get("Options")
    const lineAfterOptions = prose.slice((options?.index ?? 0) + 1).find((line) => line !== "")
    const optionsAreListed = options?.value === "" && lineAfterOptions?.startsWith("- ")
    if (options?.value !== "none" && !optionsAreListed) {
        return "**Options** is neither none nor followed by a list"
    }
    return exampleProblem(lines)
}

const fixValue = /^(none|autofix|suggestion\b)/u

const exampleProblem = (lines: string[]) => {
    const start = lines.findIndex((line) => codeFence.test(line))
    if (start === -1) return undefined
    const end = lines.findIndex((line, index) => index > start && codeFence.test(line))
    const example = lines.slice(start + 1, end)
    if (!example[0]?.startsWith("// no")) return "the example does not start with `// no`"
    if (!example.some((line) => line.startsWith("// yes"))) return "the example has no `// yes`"
    return undefined
}

const proseLines = (lines: string[]) => {
    let insideCodeBlock = false
    return lines.map((line) => {
        const isFence = codeFence.test(line)
        if (isFence) insideCodeBlock = !insideCodeBlock
        return insideCodeBlock || isFence ? "```" : line
    })
}

const sections = (markdown: string) => {
    const found: Section[] = []
    let group = ""
    let current: Section | undefined
    let insideCodeBlock = false
    for (const line of markdown.split("\n")) {
        if (codeFence.test(line)) insideCodeBlock = !insideCodeBlock
        const heading = insideCodeBlock ? undefined : sectionHeading.exec(line)?.groups
        if (heading?.title !== undefined) {
            if (heading.level === "##") group = heading.title
            current =
                heading.level === "#" ? undefined : { heading: heading.title, group, lines: [] }
            if (current) found.push(current)
        } else if (insideCodeBlock || !backLink.test(line)) {
            current?.lines.push(line)
        }
    }
    return found
}
