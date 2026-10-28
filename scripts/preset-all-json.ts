import { readFile, writeFile } from "node:fs/promises"

import all from "../src/presets/all.ts"

const allJsonUrl = new URL("../dist/presets/all.json", import.meta.url)

// JSON configs resolve `jsPlugins` against the file itself, so the path is relative here.
export const renderAllJson = () =>
    `${JSON.stringify({ jsPlugins: ["../index.js"], rules: all.rules }, null, 4)}\n`

export const readAllJson = () => readFile(allJsonUrl, "utf8")

if (import.meta.main) {
    await writeFile(allJsonUrl, renderAllJson())
}
