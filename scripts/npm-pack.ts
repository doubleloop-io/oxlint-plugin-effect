import { execFileSync } from "node:child_process"
import { join } from "node:path"

type PackResult = { filename: string; files: { path: string }[] }

const isPackResult = (value: unknown): value is PackResult =>
    typeof value === "object" &&
    value !== null &&
    "filename" in value &&
    typeof value.filename === "string" &&
    "files" in value &&
    Array.isArray(value.files)

// npm 11 prints an array of results, npm 12 an object keyed by package name.
const singlePackResult = (output: unknown) => {
    const results = typeof output === "object" && output !== null ? Object.values(output) : []
    const [result] = results
    if (results.length !== 1 || !isPackResult(result)) {
        throw new Error(`unexpected \`npm pack --json\` output: ${JSON.stringify(output)}`)
    }
    return result
}

export const npmPack = (destination: string) => {
    const { filename, files } = singlePackResult(
        JSON.parse(
            execFileSync("npm", ["pack", "--json", "--pack-destination", destination], {
                encoding: "utf8",
            }),
        ),
    )
    return { tarball: join(destination, filename), files }
}
