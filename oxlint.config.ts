import { defineConfig } from "oxlint"

// The site is a standalone project with its own dependencies and tooling.
export default defineConfig({
    ignorePatterns: ["website"],
})
