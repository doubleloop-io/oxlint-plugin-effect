import { makeFileMatcher } from "./file-globs.ts"

// `index.ts` is not matched on purpose: it is usually a barrel, and exempting it would let
// adapters reach the rest of the application through the re-exports.
export const defaultEntryFiles = ["**/main.ts", "**/cli.ts", "**/bin/**"] as const

export const isEntryFile = makeFileMatcher("entryFiles", defaultEntryFiles)
