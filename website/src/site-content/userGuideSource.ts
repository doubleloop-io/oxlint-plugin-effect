import { headingAnchor, markdownLinkHrefs } from "./internalLinks.ts"
import { markdownLines } from "./markdownLines.ts"
import { ruleTemplateProblem } from "./ruleTemplate.ts"
import type { GuideFile, SitePage, SourcePage } from "./sitePages.ts"

export const userGuideDirectory = "user-guide"

const guideIndexPath = "README.md"

const rulesIndexPath = "rules.md"

export const rulesOverviewId = "rules-overview"

// `rules/` is the parent route of the rule pages, so the rules index has a route of its own
const pageIds = new Map([
    [guideIndexPath, "index"],
    [rulesIndexPath, rulesOverviewId],
])

const landingActions = [
    { text: "Installation", link: "installation.md" },
    { text: "Rules overview", link: rulesIndexPath },
]

type Frontmatter = { title: string; order: number; group: string | undefined }

type GuideEntry = { path: string; frontmatter: Frontmatter; body: string }

const frontmatterBlock = /^---\n(?<fields>(?:.*\n)*?)---\n/u

export const userGuideSource = (files: GuideFile[]) => {
    const all = files.map(guideEntry)
    const guideEntries = all
        .filter(({ path }) => !isRuleFile(path))
        .toSorted(byFrontmatterOrderThenPath)
    const entries = [...guideEntries, ...inRulesIndexOrder(all)]
    return { sourcePages: entries.map(guidePage), routes: new Map(entries.flatMap(linkRoutes)) }
}

// The rules index sits next to `rules/`, so its links to rule files are their paths
const inRulesIndexOrder = (entries: GuideEntry[]) => {
    const rulesIndex = entries.find(({ path }) => path === rulesIndexPath)
    const linkedPaths = markdownLinkHrefs(rulesIndex?.body ?? "")
    const position = ({ path }: GuideEntry) => {
        const index = linkedPaths.indexOf(path)
        if (index === -1) {
            throw guideFileError(
                path,
                `not linked from the rules index, ${userGuideDirectory}/${rulesIndexPath}`,
            )
        }
        return index
    }
    return entries
        .filter(({ path }) => isRuleFile(path))
        .map((entry) => ({ entry, position: position(entry) }))
        .toSorted((left, right) => left.position - right.position)
        .map(({ entry }) => entry)
}

const markdownHeading = /^#{1,6} (?<heading>.+)$/u

const linkRoutes = ({ path, body }: GuideEntry) => {
    const file = `${userGuideDirectory}/${path}`
    const id = pageId(path)
    const route = id === "index" ? "" : `${id}/`
    const anchors = markdownLines(body.split("\n")).flatMap(({ line, insideCodeBlock }) => {
        const heading = insideCodeBlock ? undefined : markdownHeading.exec(line)?.groups?.heading
        return heading === undefined ? [] : [headingAnchor(heading)]
    })
    return [
        [file, route] as const,
        ...anchors.map((anchor) => [`${file}#${anchor}`, `${route}#${anchor}`] as const),
    ]
}

const pageId = (path: string) => pageIds.get(path) ?? path.replace(/\.md$/u, "")

// A page without an order goes after the ordered ones
const byFrontmatterOrderThenPath = (left: GuideEntry, right: GuideEntry) =>
    left.frontmatter.order - right.frontmatter.order || left.path.localeCompare(right.path)

const ruleDirectory = "rules/"

const isRuleFile = (path: string) => path.startsWith(ruleDirectory)

const guideFields = new Set(["title", "order"])
const ruleFields = new Set(["title", "group"])

const frontmatterField = /^(?<field>[\w-]+): *(?<value>.*)$/u

// YAML needs quotes around a value that starts with a reserved character such as `@`
const quotedValue = /^"(?<text>.*)"$/u

const integer = /^-?\d+$/u

const guideEntry = ({ path, content }: GuideFile): GuideEntry => {
    const block = frontmatterBlock.exec(content)
    if (block === null) throw guideFileError(path, "no frontmatter")
    const fields = new Map(
        (block.groups?.fields ?? "")
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => {
                const { field, value = "" } = frontmatterField.exec(line)?.groups ?? {}
                if (field === undefined) {
                    throw guideFileError(path, `frontmatter line \`${line}\` is not \`field: value\``)
                }
                if (!(isRuleFile(path) ? ruleFields : guideFields).has(field)) {
                    throw guideFileError(path, `frontmatter has unknown field \`${field}\``)
                }
                const trimmed = value.trim()
                return [field, quotedValue.exec(trimmed)?.groups?.text ?? trimmed] as const
            }),
    )
    const title = fields.get("title")
    if (title === undefined || title === "") throw guideFileError(path, "frontmatter has no `title`")
    const order = fields.get("order")
    if (order !== undefined && !integer.test(order)) {
        throw guideFileError(path, "frontmatter `order` is not an integer")
    }
    const group = fields.get("group")
    if (isRuleFile(path) && (group === undefined || group === "")) {
        throw guideFileError(path, "frontmatter has no `group`")
    }
    const frontmatter = {
        title,
        order: order === undefined ? Number.POSITIVE_INFINITY : Number(order),
        group,
    }
    return { path, frontmatter, body: `${content.slice(block[0].length).trim()}\n` }
}

const guideFileError = (path: string, problem: string) =>
    new Error(`${userGuideDirectory}/${path}: ${problem}`)

const guidePage = ({ path, frontmatter, body }: GuideEntry): SourcePage => ({
    page: sitePage(path, frontmatter, body),
    file: `${userGuideDirectory}/${path}`,
})

const sitePage = (path: string, { title, group }: Frontmatter, body: string): SitePage => {
    if (path === guideIndexPath) return landingPage(title, body)
    if (group !== undefined) {
        const problem = ruleTemplateProblem(body)
        if (problem !== undefined) throw guideFileError(path, problem)
        return { kind: "rule", id: pageId(path), title, group, body }
    }
    return { kind: "guide", id: pageId(path), title, body }
}

const packageName = /^(?<scope>@[^/]+\/)?(?<name>.+)$/u

// The title is the package name, split so the scope can sit above the name;
// the first paragraph is the tagline under it, so the body starts after it
const landingPage = (title: string, body: string): SitePage => {
    const { scope, name = title } = packageName.exec(title)?.groups ?? {}
    const [tagline = "", ...rest] = body.split("\n\n")
    return {
        kind: "landing",
        id: "index",
        title,
        scope,
        name,
        tagline: tagline.trim(),
        body: rest.length === 0 ? "" : `${rest.join("\n\n").trim()}\n`,
        actions: landingActions,
    }
}
