import { RuleTester } from "oxlint/plugins-dev"

import { serviceBuiltWithOfRule } from "./service-built-with-of.ts"

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "service-built-with-of",
    serviceBuiltWithOfRule,
    {
        valid: [
            "const RepoLive = Layer.succeed(Repo, Repo.of({ find }))",
            "const RepoLive = Layer.sync(Repo, () => Repo.of({ find }))",
            "const RepoLive = Layer.sync(Repo, makeRepo)",
            `const RepoLive = Layer.effect(Repo, Effect.gen(function* () {
    const db = yield* Database
    return Repo.of({ find: (id) => db.get(id) })
}))`,
            // Only the literal the Layer provides: nested objects are its fields.
            `const RepoLive = Layer.effect(Repo, Effect.gen(function* () {
    const helpers = () => { return { a: 1 } }
    return Repo.of({ find: () => ({ id: 1 }) })
}))`,
            "const ConfigLive = Layer.succeed(AppConfig, config)",
        ],
        invalid: [
            {
                code: "const RepoLive = Layer.succeed(Repo, { find })",
                errors: [
                    {
                        messageId: "bareLiteral",
                        data: { tag: "Repo" },
                        suggestions: [
                            {
                                messageId: "wrapWithOf",
                                output: "const RepoLive = Layer.succeed(Repo, Repo.of({ find }))",
                            },
                        ],
                    },
                ],
            },
            {
                code: "const RepoLive = Layer.succeed(Repo)({ find })",
                errors: [{ messageId: "bareLiteral" }],
            },
            {
                code: "const RepoLive = Layer.sync(Repo, () => ({ find }))",
                errors: [{ messageId: "bareLiteral" }],
            },
            {
                code: "const RepoLive = Layer.sync(Repo, function () { return { find } })",
                errors: [{ messageId: "bareLiteral" }],
            },
            {
                code: `const RepoLive = Layer.effect(Repo, Effect.gen(function* () {
    const db = yield* Database
    return { find: (id) => db.get(id) }
}))`,
                errors: [
                    {
                        messageId: "bareLiteral",
                        suggestions: [
                            {
                                messageId: "wrapWithOf",
                                output: `const RepoLive = Layer.effect(Repo, Effect.gen(function* () {
    const db = yield* Database
    return Repo.of({ find: (id) => db.get(id) })
}))`,
                            },
                        ],
                    },
                ],
            },
            {
                code: "const RepoLive = Layer.scoped(Repo)(Effect.gen(function* () { return { find } }))",
                errors: [{ messageId: "bareLiteral" }],
            },
        ],
    },
)
