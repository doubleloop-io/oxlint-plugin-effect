export type SitePage = {
    id: string
    title: string
    body: string
}

type RuleSection = {
    name: string
    lines: string[]
}

const ruleHeading = /^### `(?<name>[a-z-]+)`$/u
const sectionHeading = /^#{1,3} /u
const codeFence = /^```/u

export const sitePages = (rulesMarkdown: string): SitePage[] =>
    ruleSections(rulesMarkdown).map(({ name, lines }) => ({
        id: `rules/${name}`,
        title: name,
        body: `${lines.join("\n").trim()}\n`,
    }))

const ruleSections = (markdown: string) => {
    const sections: RuleSection[] = []
    let current: RuleSection | undefined
    let insideCodeBlock = false
    for (const line of markdown.split("\n")) {
        if (codeFence.test(line)) insideCodeBlock = !insideCodeBlock
        const heading = insideCodeBlock ? undefined : sectionHeading.exec(line)
        if (heading) {
            const name = ruleHeading.exec(line)?.groups?.name
            current = name === undefined ? undefined : { name, lines: [] }
            if (current) sections.push(current)
        } else {
            current?.lines.push(line)
        }
    }
    return sections
}
