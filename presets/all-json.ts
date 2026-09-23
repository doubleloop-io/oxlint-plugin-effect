import { readFile, writeFile } from "node:fs/promises"

import all from "./all.ts"

const allJsonUrl = new URL("./all.json", import.meta.url)

// JSON configs resolve `jsPlugins` against the file itself, so the path is relative here.
export const renderAllJson = () =>
    `${JSON.stringify({ jsPlugins: ["../index.ts"], rules: all.rules }, null, 4)}\n`

export const readAllJson = () => readFile(allJsonUrl, "utf8")

if (import.meta.main) {
    await writeFile(allJsonUrl, renderAllJson())
}
