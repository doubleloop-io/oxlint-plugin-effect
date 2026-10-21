import { makeFileMatcher } from "./file-globs.ts"

// `src/testing/` helpers are not matched on purpose: they are support code, not tests.
export const defaultTestFiles = [
    "**/*.test.*",
    "**/*.spec.*",
    "**/__tests__/**",
    "**/test/**",
    "**/tests/**",
] as const

export const isTestFile = makeFileMatcher("testFiles", defaultTestFiles)
