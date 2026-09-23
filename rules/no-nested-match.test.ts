import { RuleTester } from "oxlint/plugins-dev"

import { noNestedMatchRule } from "./no-nested-match.ts"

new RuleTester().run("no-nested-match", noNestedMatchRule, {
    valid: [
        "const label = Option.match(after, { onNone: () => 'in testa', onSome: (name) => `dopo ${name}` })",
        "const run = CliCommand.$match(command, { Missing: () => printMissing, Fill: ({ only }) => fill(only) })",
        `const run = (argv) => {
            const parsed = parseArgs(argv)
            if (Result.isFailure(parsed)) return usageError(parsed.failure)
            return CliCommand.$match(parsed.success, { Missing: () => printMissing })
        }`,
        "const found = Option.match(only, { onNone: () => all, onSome: Effect.fn('only')(function* (name) { if (known) yield* log; return [name] }) })",
    ],
    invalid: [
        {
            code: "const run = Result.match(parsed, { onFailure: usageError, onSuccess: ({ dryRun }) => dryRun ? plan : fill })",
            errors: [{ messageId: "nestedBranch" }],
        },
        {
            code: "const run = Result.match(parsed, { onFailure: usageError, onSuccess: CliCommand.$match({ Missing: () => printMissing }) })",
            errors: [{ messageId: "nestedBranch" }],
        },
        {
            code: "const tab = Option.match(wanted, { onNone: () => first, onSome: (title) => { return Option.match(find(title), { onNone: () => first, onSome: (tab) => tab }) } })",
            errors: [{ messageId: "nestedBranch" }],
        },
        {
            code: "const lines = Match.valueTags(action, { Create: (a) => a.header ? [a.header] : [], Use: () => [] })",
            errors: [{ messageId: "nestedBranch" }],
        },
    ],
})
