import { readFile } from "node:fs/promises"

import { readUserGuide } from "./readSiteSources.ts"

export const repositoryRoot = new URL("../../../", import.meta.url)

export const rulesMarkdown = await readFile(new URL("RULES.md", repositoryRoot), "utf8")

export const userGuide = await readUserGuide(new URL("user-guide/", repositoryRoot))

export const rulesIndexRow =
    /^\| (?:\[(?<group>[^\]]+)\]\(#(?<groupAnchor>[a-z-]+)\))? +\| \[`(?<rule>[a-z-]+)`\]/gmu

// A group's row in the rules index names its first rule
const firstRuleOfGroup = new Map(
    [...rulesMarkdown.matchAll(rulesIndexRow)].flatMap(({ groups }) =>
        groups?.groupAnchor === undefined ? [] : [[groups.groupAnchor, groups.rule] as const],
    ),
)

// The route a test expects for a RULES.md anchor, stated apart from how the site derives it
export const expectedRulesMdRoute = (anchor: string) =>
    anchor === "rules-index"
        ? "rules-overview/"
        : `rules/${firstRuleOfGroup.get(anchor) ?? anchor}/`
