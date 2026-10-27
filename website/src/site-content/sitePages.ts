export type SitePage = {
    id: string
    title: string
    group: string
    body: string
}

type RuleSection = {
    name: string
    group: string
    lines: string[]
}

const groupHeading = /^## (?<title>.+)$/u
const ruleHeading = /^### `(?<name>[a-z-]+)`$/u
const sectionHeading = /^#{1,3} /u
const codeFence = /^```/u
const backLink = /^<sup>\[↑ rules index\]\(#rules-index\)<\/sup>$/u

const requiredFields = ["Intent", "Trigger", "Options", "Fix"]
const fieldLabel = /^\*\*(?<label>[^*]+)\*\*:/u

export const sitePages = (rulesMarkdown: string): SitePage[] =>
    ruleSections(rulesMarkdown).map((section) => {
        assertFollowsCatalogTemplate(section)
        return {
            id: `rules/${section.name}`,
            title: section.name,
            group: section.group,
            body: `${section.lines.join("\n").trim()}\n`,
        }
    })

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

const ruleSections = (markdown: string) => {
    const sections: RuleSection[] = []
    let group = ""
    let current: RuleSection | undefined
    let insideCodeBlock = false
    for (const line of markdown.split("\n")) {
        if (codeFence.test(line)) insideCodeBlock = !insideCodeBlock
        const heading = insideCodeBlock ? undefined : sectionHeading.exec(line)
        if (heading) {
            group = groupHeading.exec(line)?.groups?.title ?? group
            const name = ruleHeading.exec(line)?.groups?.name
            current = name === undefined ? undefined : { name, group, lines: [] }
            if (current) sections.push(current)
        } else if (insideCodeBlock || !backLink.test(line)) {
            current?.lines.push(line)
        }
    }
    return sections
}
