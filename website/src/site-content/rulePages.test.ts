import assert from "node:assert/strict"
import { test } from "node:test"

import { ruleBody, ruleFile, rulePagesOf, rulesIndexFile } from "./sourceMarkdownBuilders.ts"

test("a rule file is a rule page named after the rule, in the group of its frontmatter, with the file body", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        ruleFile("no-effect-promise", { group: "Error channel" }),
    ]

    const pages = rulePagesOf(userGuide)

    assert.deepEqual(pages, [
        {
            kind: "rule",
            id: "rules/no-effect-promise",
            title: "no-effect-promise",
            group: "Error channel",
            body: ruleBody(),
        },
    ])
})

for (const [field, label] of [
    ["intent", "Intent"],
    ["trigger", "Trigger"],
    ["options", "Options"],
    ["fix", "Fix"],
] as const) {
    test(`a rule file without ${label} fails the build, naming the file and the field`, () => {
        const userGuide = [
            rulesIndexFile("no-effect-promise"),
            ruleFile("no-effect-promise", { fields: { [field]: null } }),
        ]

        assert.throws(() => rulePagesOf(userGuide), {
            message: `user-guide/rules/no-effect-promise.md: missing **${label}**`,
        })
    })
}

for (const [scenario, fields, problem] of [
    [
        "a Fix other than none, autofix or a suggestion",
        { fix: "**Fix**: sometimes" },
        "**Fix** is not none, autofix or suggestion",
    ],
    [
        "Options that are neither none nor a list",
        { options: "**Options**: a few." },
        "**Options** is neither none nor followed by a list",
    ],
    [
        "an example that does not open with the reported form",
        { example: "```ts\n// yes\nright()\n\n// no\nwrong()\n```" },
        "the example does not start with `// no`",
    ],
    [
        "an example with no compliant form",
        { example: "```ts\n// no\nwrong()\n```" },
        "the example has no `// yes`",
    ],
] as const) {
    test(`a rule file with ${scenario} fails the build, naming the file`, () => {
        const userGuide = [rulesIndexFile("no-effect-promise"), ruleFile("no-effect-promise", { fields })]

        assert.throws(() => rulePagesOf(userGuide), {
            message: `user-guide/rules/no-effect-promise.md: ${problem}`,
        })
    })
}

test("Options followed by a list and a suggestion Fix with its detail follow the template", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        ruleFile("no-effect-promise", {
            fields: {
                options: "**Options**:\n\n- `testFiles`: shared setting.",
                fix: "**Fix**: suggestion that wraps the literal",
            },
        }),
    ]

    const pages = rulePagesOf(userGuide)

    assert.equal(pages.length, 1)
})

test("a sibling rule may leave the example, Exemptions and Why to the rule it links to", () => {
    const userGuide = [
        rulesIndexFile("try-object-form"),
        ruleFile("try-object-form", { fields: { example: null, exemptions: null, why: null } }),
    ]

    const pages = rulePagesOf(userGuide)

    assert.deepEqual(
        pages.map(({ id }) => id),
        ["rules/try-object-form"],
    )
})

test("a heading-like line inside a code example stays in the rule body", () => {
    const example = "```ts\n// no\n## not a heading\nwrong()\n\n// yes\nright()\n```"
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        ruleFile("no-effect-promise", { fields: { example } }),
    ]

    const [page] = rulePagesOf(userGuide)

    assert.match(page?.body ?? "", /## not a heading/u)
})

test("a rule file without a group fails the build, naming the file", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        {
            path: "rules/no-effect-promise.md",
            content: `---\ntitle: no-effect-promise\n---\n\n${ruleBody()}`,
        },
    ]

    assert.throws(() => rulePagesOf(userGuide), {
        message: "user-guide/rules/no-effect-promise.md: frontmatter has no `group`",
    })
})

test("rule pages follow the order of their links in the rules index, whatever the file order", () => {
    const userGuide = [
        ruleFile("try-object-form", { group: "Error channel" }),
        ruleFile("no-nested-match", { group: "Code shape" }),
        ruleFile("no-effect-promise", { group: "Error channel" }),
        rulesIndexFile("no-effect-promise", "try-object-form", "no-nested-match"),
    ]

    const ids = rulePagesOf(userGuide).map(({ id }) => id)

    assert.deepEqual(ids, [
        "rules/no-effect-promise",
        "rules/try-object-form",
        "rules/no-nested-match",
    ])
})

test("a rule file the rules index does not link fails the build, naming the file", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        ruleFile("no-effect-promise"),
        ruleFile("try-object-form"),
    ]

    assert.throws(() => rulePagesOf(userGuide), {
        message:
            "user-guide/rules/try-object-form.md: not linked from the rules index, user-guide/rules.md",
    })
})

test("a guide file outside the rule directory with a group fails the build, naming the file", () => {
    const userGuide = [
        { path: "versioning.md", content: "---\ntitle: Versioning\ngroup: Misc\n---\n\nText.\n" },
    ]

    assert.throws(() => rulePagesOf(userGuide), {
        message: "user-guide/versioning.md: frontmatter has unknown field `group`",
    })
})
