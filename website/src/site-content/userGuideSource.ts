import { headingAnchor } from "./internalLinks.ts"
import { markdownLines } from "./markdownLines.ts"
import type { GuideFile, SourcePage } from "./sitePages.ts"

export const userGuideDirectory = "user-guide"

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
    const route = `${pageId(path)}/`
    const anchors = markdownLines(body.split("\n")).flatMap(({ line, insideCodeBlock }) => {
        const heading = insideCodeBlock ? undefined : markdownHeading.exec(line)?.groups?.heading
        return heading === undefined ? [] : [headingAnchor(heading)]
    })
    return [
        [file, route] as const,
        ...anchors.map((anchor) => [`${file}#${anchor}`, `${route}#${anchor}`] as const),
    ]
}

const pageId = (path: string) => path.replace(/\.md$/u, "")

// A page without an order goes after the ordered ones
const byFrontmatterOrderThenPath = (left: GuideEntry, right: GuideEntry) =>
    left.frontmatter.order - right.frontmatter.order || left.path.localeCompare(right.path)

const knownFields = new Set(["title", "order"])

const frontmatterField = /^(?<field>[\w-]+): *(?<value>.*)$/u

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
                return [field, value.trim()] as const
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
    page: { kind: "guide", id: pageId(path), title: frontmatter.title, body },
    file: `${userGuideDirectory}/${path}`,
    location: undefined,
})
