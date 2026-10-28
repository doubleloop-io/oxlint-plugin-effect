import { type GuideFile, type SiteOptions, sitePages } from "./sitePages.ts"

type RuleFields = {
    intent: string
    example: string
    trigger: string
    exemptions: string
    why: string
    options: string
    fix: string
}

export const wellFormedFields: RuleFields = {
    intent: "**Intent**: do the right thing.",
    example: "```ts\n// no\nwrong()\n\n// yes\nright()\n```",
    trigger: "**Trigger**: a call to `wrong`.",
    exemptions: "**Exemptions and blind spots**: aliases slip through.",
    why: "**Why**: wrong things cost.",
    options: "**Options**: none",
    fix: "**Fix**: none",
}

export const testSite: SiteOptions = {
    base: "/site",
    repositoryUrl: "https://github.com/owner/the-plugin",
}

export const frontmatter = (fields: Record<string, string | number>) =>
    ["---", ...Object.entries(fields).map(([key, value]) => `${key}: ${value}`), "---", ""].join("\n")

export const guideFile = (
    path: string,
    fields: Record<string, string | number> = {},
    body = "Some text.\n",
): GuideFile => ({ path, content: `${frontmatter({ title: "A page", ...fields })}\n${body}` })

export const ruleBody = (fields: Partial<Record<keyof RuleFields, string | null>> = {}) =>
    Object.values({ ...wellFormedFields, ...fields })
        .filter((block) => block !== null)
        .join("\n\n") + "\n"

export const ruleFile = (
    name: string,
    {
        group = "Error channel",
        fields = {},
    }: { group?: string; fields?: Parameters<typeof ruleBody>[0] } = {},
): GuideFile => ({
    path: `rules/${name}.md`,
    content: `${frontmatter({ title: name, group })}\n${ruleBody(fields)}`,
})

// The rules index orders the rule pages by the order of its links
export const rulesIndexFile = (...rules: string[]) =>
    guideFile(
        "rules.md",
        { title: "Rules overview" },
        `${rules.map((rule) => `- [\`${rule}\`](rules/${rule}.md)`).join("\n")}\n`,
    )

export const pagesOf = (userGuide: GuideFile[]) => sitePages({ userGuide }, testSite)

export const guidePagesOf = (userGuide: GuideFile[]) =>
    pagesOf(userGuide).filter(({ kind }) => kind === "guide" || kind === "landing")

export const rulePagesOf = (userGuide: GuideFile[]) =>
    pagesOf(userGuide).filter((page) => page.kind === "rule")
