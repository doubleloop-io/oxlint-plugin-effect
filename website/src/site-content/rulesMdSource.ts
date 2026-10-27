import { headingAnchor } from "./internalLinks.ts"
import { isCodeFence, markdownLines } from "./markdownLines.ts"
import type { SitePage, SourcePage } from "./sitePages.ts"

type Section = {
    heading: string
    group: string
    lines: string[]
}

type RuleSection = Section & { name: string }

const file = "RULES.md"

const referencePageIds = new Map([
    ["Rules index", "rules"],
    ["Common limits", "common-limits"],
    ["Shared settings", "shared-settings"],
])

const sectionHeading = /^(?<level>#{1,3}) (?<title>.+)$/u
const ruleHeading = /^`(?<name>[a-z-]+)`$/u

export const backLink = "<sup>[↑ rules index](#rules-index)</sup>"

const requiredFields = ["Intent", "Trigger", "Options", "Fix"]
const fieldLabel = /^\*\*(?<label>[^*]+)\*\*:/u

export const rulesMdSource = (markdown: string) => {
    const allSections = sections(markdown)
    const rulesMdPages = allSections.flatMap(rulesMdPage)
    return {
        sourcePages: rulesMdPages.map(({ heading: _, ...source }) => source),
        routes: linkRoutes(allSections, rulesMdPages),
    }
}

type RulesMdPage = SourcePage & { heading: string }

const rulesMdPage = (section: Section): RulesMdPage[] => {
    const { heading } = section
    const name = ruleHeading.exec(heading)?.groups?.name
    if (name !== undefined) {
        const page = rulePage({ ...section, name })
        return [{ page, file, heading, location: `rule \`${name}\`` }]
    }
    const id = referencePageIds.get(heading)
    if (id === undefined) return []
    const page: SitePage = { kind: "reference", id, title: heading, body: body(section) }
    return [{ page, file, heading, location: `section \`${heading}\`` }]
}

// A group has no page: its anchor leads to its first rule, as its heading does in RULES.md
const linkRoutes = (allSections: Section[], sourcePages: RulesMdPage[]) =>
    new Map([
        [file, "rules/"],
        ...allSections.flatMap(({ heading }): [string, string][] => {
            const target =
                sourcePages.find((source) => source.heading === heading)?.page ??
                sourcePages.find(({ page }) => page.kind === "rule" && page.group === heading)?.page
            return target === undefined
                ? []
                : [[`${file}#${headingAnchor(heading)}`, `${target.id}/`]]
        }),
    ])

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
    const start = lines.findIndex(isCodeFence)
    if (start === -1) return undefined
    const end = lines.findIndex((line, index) => index > start && isCodeFence(line))
    const example = lines.slice(start + 1, end)
    if (!example[0]?.startsWith("// no")) return "the example does not start with `// no`"
    if (!example.some((line) => line.startsWith("// yes"))) return "the example has no `// yes`"
    return undefined
}

const proseLines = (lines: string[]) =>
    markdownLines(lines).map(({ line, isFence, insideCodeBlock }) =>
        insideCodeBlock || isFence ? "```" : line,
    )

const sections = (markdown: string) => {
    const found: Section[] = []
    let group = ""
    let current: Section | undefined
    for (const { line, insideCodeBlock } of markdownLines(markdown.split("\n"))) {
        const heading = insideCodeBlock ? undefined : sectionHeading.exec(line)?.groups
        if (heading?.title !== undefined) {
            if (heading.level === "##") group = heading.title
            current =
                heading.level === "#" ? undefined : { heading: heading.title, group, lines: [] }
            if (current) found.push(current)
        } else if (insideCodeBlock || line !== backLink) {
            current?.lines.push(line)
        }
    }
    return found
}
