import { readdir, readFile } from "node:fs/promises"

import type { GuideFile, SiteSources } from "./sitePages.ts"
import { userGuideDirectory } from "./userGuideSource.ts"

export const readSiteSources = async (siteRoot: URL): Promise<SiteSources> => ({
    userGuide: await readUserGuide(new URL(`../${userGuideDirectory}/`, siteRoot)),
})

export const readUserGuide = async (directory: URL) => {
    const paths = await readdir(directory, { recursive: true })
    const markdownPaths = paths.filter((path) => path.endsWith(".md")).toSorted()
    return Promise.all(
        markdownPaths.map(
            async (path): Promise<GuideFile> => ({
                path: path.replaceAll("\\", "/"),
                content: await readFile(new URL(path, directory), "utf8"),
            }),
        ),
    )
}
