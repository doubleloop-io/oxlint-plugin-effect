import assert from "node:assert/strict"
import { test } from "node:test"

import { sitePages } from "./sitePages.ts"

const ruleSection = (name: string, body = "**Intent**: something.\n") =>
    `### \`${name}\`\n\n${body}`

const rulesMarkdown = (...sections: string[]) =>
    ["# Rules\n", "## Rules index\n\n| Rule |\n| --- |\n", "## Error channel\n", ...sections].join(
        "\n",
    )

test("each rule section becomes a page named after the rule, with its section body", () => {
    const markdown = rulesMarkdown(
        ruleSection("no-effect-promise", "**Intent**: lift with tryPromise.\n"),
        ruleSection("try-object-form", "**Intent**: use the object form.\n"),
    )

    const pages = sitePages(markdown)

    assert.deepEqual(pages, [
        {
            id: "rules/no-effect-promise",
            title: "no-effect-promise",
            body: "**Intent**: lift with tryPromise.\n",
        },
        {
            id: "rules/try-object-form",
            title: "try-object-form",
            body: "**Intent**: use the object form.\n",
        },
    ])
})

test("a rule section ends at the next group heading", () => {
    const markdown = rulesMarkdown(
        ruleSection("no-effect-promise", "**Intent**: lift with tryPromise.\n"),
        "## Tagged values\n\nRules about tagged values.\n",
        ruleSection("no-manual-discriminant-comparison"),
    )

    const pages = sitePages(markdown)

    assert.equal(pages[0]?.body, "**Intent**: lift with tryPromise.\n")
    assert.deepEqual(
        pages.map(({ id }) => id),
        ["rules/no-effect-promise", "rules/no-manual-discriminant-comparison"],
    )
})

test("a heading-like line inside a code example stays in the rule body", () => {
    const body = "**Intent**: something.\n\n```ts\n// no\n## not a heading\n```\n"
    const markdown = rulesMarkdown(ruleSection("no-effect-promise", body))

    const pages = sitePages(markdown)

    assert.equal(pages[0]?.body, body)
})
