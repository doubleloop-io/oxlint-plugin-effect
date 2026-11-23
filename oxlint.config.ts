import { defineConfig } from "oxlint"

// The site is a standalone project with its own dependencies and tooling; the eval cases are
// snippets for agents, linted only by the rule under test.
export default defineConfig({
    ignorePatterns: ["evals", "website"],
})
