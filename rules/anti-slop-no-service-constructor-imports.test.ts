import { RuleTester } from "oxlint/plugins-dev"

import { antiSlopNoServiceConstructorImportsRule } from "./anti-slop-no-service-constructor-imports.ts"

new RuleTester().run(
    "anti-slop-no-service-constructor-imports",
    antiSlopNoServiceConstructorImportsRule,
    {
        valid: [
            {
                filename: "src/issue-service.test.ts",
                code: 'import { makeIssueService } from "./issue-service.ts";',
            },
            {
                filename: "src/issue-service.spec.tsx",
                code: 'import { makeIssueService } from "../issue-service.ts";',
            },
            {
                filename: "src/issue-service.check.ts",
                code: 'import { makeIssueService } from "./issue-service.ts";',
                options: [{ testFiles: ["**/*.check.ts"] }],
            },
            {
                filename: "src/runtime.ts",
                code: 'import { makeExecutionMemo } from "alchemy/Runtime/ExecutionMemo";',
            },
            {
                filename: "src/runtime.ts",
                code: 'import { issueServiceLayer } from "./issue-service.ts";\nWorkspaceName.make("name");',
            },
            {
                filename: "src/runtime.ts",
                code: 'import { makeissueService } from "./issue-service.ts";',
            },
        ],
        invalid: [
            {
                filename: "src/runtime.ts",
                code: 'import { makeIssueService } from "./issue-service.ts";',
                errors: [
                    { messageId: "serviceConstructorImport", data: { name: "makeIssueService" } },
                ],
            },
            {
                filename: "src/runtime.ts",
                code: 'import { makeIssueService as createIssueService } from "../issue-service.ts";',
                errors: [
                    { messageId: "serviceConstructorImport", data: { name: "makeIssueService" } },
                ],
            },
            {
                // `testFiles` replaces the defaults, so a `.test.ts` outside the new globs is checked.
                filename: "src/issue-service.test.ts",
                code: 'import { makeIssueService } from "./issue-service.ts";',
                options: [{ testFiles: ["**/*.check.ts"] }],
                errors: [
                    { messageId: "serviceConstructorImport", data: { name: "makeIssueService" } },
                ],
            },
        ],
    },
)
