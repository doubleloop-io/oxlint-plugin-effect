import { readFile } from "node:fs/promises"

export const readRulesMarkdown = (siteRoot: URL) =>
    readFile(new URL("../RULES.md", siteRoot), "utf8")
