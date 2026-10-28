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

// Whether a file is a rule is decided once, from its path, when it is parsed
type ParsedGuideFile = { path: string; title: string; body: string } & (
    | { kind: "rule"; group: string }
    | { kind: "page"; order: number }
)

const frontmatterBlock = /^---\n(?<fields>(?:.*\n)*?)---\n/u

export const userGuideSource = (files: GuideFile[]) => {
    const parsed = files.map(parseGuideFile)
    const pages = parsed.filter((file) => file.kind === "page").toSorted(byOrderThenPath)
    const ordered = [...pages, ...inRulesIndexOrder(parsed)]
    return { sourcePages: ordered.map(sourcePage), routes: new Map(ordered.flatMap(linkRoutes)) }
}

// The rules index sits next to `rules/`, so its links to rule files are their paths
const inRulesIndexOrder = (files: ParsedGuideFile[]) => {
    const rulesIndex = files.find(({ path }) => path === rulesIndexPath)
    const linkedPaths = markdownLinkHrefs(rulesIndex?.body ?? "")
    const position = ({ path }: ParsedGuideFile) => {
        const index = linkedPaths.indexOf(path)
        if (index === -1) {
            throw guideFileError(
                path,
                `not linked from the rules index, ${userGuideDirectory}/${rulesIndexPath}`,
            )
        }
        return index
    }
    return files
        .filter((file) => file.kind === "rule")
        .map((file) => ({ file, position: position(file) }))
        .toSorted((left, right) => left.position - right.position)
        .map(({ file }) => file)
}

const markdownHeading = /^#{1,6} (?<heading>.+)$/u

const linkRoutes = ({ path, body }: ParsedGuideFile) => {
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

type OrderedFile = { path: string; order: number }

const byOrderThenPath = (left: OrderedFile, right: OrderedFile) =>
    left.order - right.order || left.path.localeCompare(right.path)

const ruleDirectory = "rules/"

const isRuleFile = (path: string) => path.startsWith(ruleDirectory)

const guideFields = new Set(["title", "order"])
const ruleFields = new Set(["title", "group"])

const frontmatterField = /^(?<field>[\w-]+): *(?<value>.*)$/u

// YAML needs quotes around a value that starts with a reserved character such as `@`
const quotedValue = /^"(?<text>.*)"$/u

const integer = /^-?\d+$/u

const parseGuideFile = ({ path, content }: GuideFile): ParsedGuideFile => {
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
    const body = `${content.slice(block[0].length).trim()}\n`
    if (isRuleFile(path)) {
        const group = fields.get("group")
        if (group === undefined || group === "") throw guideFileError(path, "frontmatter has no `group`")
        return { kind: "rule", path, title, group, body }
    }
    // A page without an order goes after the ordered ones
    const position = order === undefined ? Number.POSITIVE_INFINITY : Number(order)
    return { kind: "page", path, title, order: position, body }
}

const guideFileError = (path: string, problem: string) =>
    new Error(`${userGuideDirectory}/${path}: ${problem}`)

const sourcePage = (file: ParsedGuideFile): SourcePage => ({
    page: sitePage(file),
    file: `${userGuideDirectory}/${file.path}`,
})

const sitePage = (file: ParsedGuideFile): SitePage => {
    const { path, title, body } = file
    if (file.kind === "rule") {
        const problem = ruleTemplateProblem(body)
        if (problem !== undefined) throw guideFileError(path, problem)
        return { kind: "rule", id: pageId(path), title, group: file.group, body }
    }
    if (path === guideIndexPath) return landingPage(title, body)
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
