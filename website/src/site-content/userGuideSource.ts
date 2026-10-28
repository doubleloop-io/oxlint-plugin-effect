import { headingAnchor } from "./internalLinks.ts"
import { markdownLines } from "./markdownLines.ts"
import type { GuideFile, SitePage, SourcePage } from "./sitePages.ts"

export const userGuideDirectory = "user-guide"

const guideIndexPath = "README.md"

export const rulesOverviewId = "rules-overview"

// `rules/` is the parent route of the rule pages, so the rules index has a route of its own
const pageIds = new Map([
    [guideIndexPath, "index"],
    ["rules.md", rulesOverviewId],
])

const landingActions = [
    { text: "Installation", link: "installation.md" },
    { text: "Rules overview", link: "rules.md" },
]

type Frontmatter = { title: string; order: number }

type GuideEntry = { path: string; frontmatter: Frontmatter; body: string }

const frontmatterBlock = /^---\n(?<fields>(?:.*\n)*?)---\n/u

export const userGuideSource = (files: GuideFile[]) => {
    const entries = files.map(guideEntry).toSorted(byFrontmatterOrderThenPath)
    return { sourcePages: entries.map(guidePage), routes: new Map(entries.flatMap(linkRoutes)) }
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

const knownFields = new Set(["title", "order"])

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
                if (!knownFields.has(field)) {
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
    const frontmatter = {
        title,
        order: order === undefined ? Number.POSITIVE_INFINITY : Number(order),
    }
    return { path, frontmatter, body: `${content.slice(block[0].length).trim()}\n` }
}

const guideFileError = (path: string, problem: string) =>
    new Error(`${userGuideDirectory}/${path}: ${problem}`)

const guidePage = ({ path, frontmatter, body }: GuideEntry): SourcePage => ({
    page:
        path === guideIndexPath
            ? landingPage(frontmatter.title, body)
            : { kind: "guide", id: pageId(path), title: frontmatter.title, body },
    file: `${userGuideDirectory}/${path}`,
    location: undefined,
})

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
