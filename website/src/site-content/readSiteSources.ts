import { readFile } from "node:fs/promises"

import type { SiteSources } from "./sitePages.ts"

export const readSiteSources = async (siteRoot: URL): Promise<SiteSources> => ({
    rulesMd: await readFile(new URL("../RULES.md", siteRoot), "utf8"),
    readmeMd: await readFile(new URL("../README.md", siteRoot), "utf8"),
})
