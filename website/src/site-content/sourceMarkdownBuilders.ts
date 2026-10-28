import { backLink } from "./rulesMdSource.ts"
import { type GuideFile, type SiteOptions, type SiteSources, sitePages } from "./sitePages.ts"

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

export const ruleSection = (
    name: string,
    fields: Partial<Record<keyof RuleFields, string | null>> = {},
) =>
    [`### \`${name}\``, backLink, ...Object.values({ ...wellFormedFields, ...fields })]
        .filter((block) => block !== null)
        .join("\n\n") + "\n"

export const rulesMarkdown = (...groups: string[]) =>
    ["# Rules\n", "## Rules index\n\n| Group | Rule |\n| --- | --- |\n", ...groups].join("\n")

export const group = (title: string, ...sections: string[]) =>
    [`## ${title}\n`, ...sections].join("\n")

// The landing page links to Installation, so a README always has one
export const readmeMarkdown = (...sections: string[]) =>
    [
        "# the-plugin\n\nA plugin.\n",
        ...sections,
        ...(sections.some((section) => section.startsWith("## Installation\n"))
            ? []
            : ["## Installation\n\nInstall it.\n"]),
    ].join("\n")

export const frontmatter = (fields: Record<string, string | number>) =>
    ["---", ...Object.entries(fields).map(([key, value]) => `${key}: ${value}`), "---", ""].join("\n")

export const guideFile = (
    path: string,
    fields: Record<string, string | number> = {},
    body = "Some text.\n",
): GuideFile => ({ path, content: `${frontmatter({ title: "A page", ...fields })}\n${body}` })

export const pagesOf = ({
    rulesMd = rulesMarkdown(group("Error channel", ruleSection("no-effect-promise"))),
    readmeMd = readmeMarkdown(),
    userGuide = [],
}: Partial<SiteSources>) => sitePages({ rulesMd, readmeMd, userGuide }, testSite)

const readmePageIds = new Set(pagesOf({}).map(({ id }) => id))

export const guidePagesOf = (userGuide: GuideFile[]) =>
    pagesOf({ userGuide }).filter(({ id }) => !readmePageIds.has(id))
