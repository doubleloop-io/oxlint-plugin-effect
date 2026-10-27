import assert from "node:assert/strict"
import { test } from "node:test"

import { sitePages } from "./sitePages.ts"

type RuleFields = {
    intent: string
    example: string
    trigger: string
    exemptions: string
    why: string
    options: string
    fix: string
}

const wellFormedFields: RuleFields = {
    intent: "**Intent**: do the right thing.",
    example: "```ts\n// no\nwrong()\n\n// yes\nright()\n```",
    trigger: "**Trigger**: a call to `wrong`.",
    exemptions: "**Exemptions and blind spots**: aliases slip through.",
    why: "**Why**: wrong things cost.",
    options: "**Options**: none",
    fix: "**Fix**: none",
}

const siteBase = "/site"

const backLink = "<sup>[↑ rules index](#rules-index)</sup>"

const ruleSection = (name: string, fields: Partial<Record<keyof RuleFields, string | null>> = {}) =>
    [`### \`${name}\``, backLink, ...Object.values({ ...wellFormedFields, ...fields })]
        .filter((block) => block !== null)
        .join("\n\n") + "\n"

const rulesMarkdown = (...groups: string[]) =>
    ["# Rules\n", "## Rules index\n\n| Group | Rule |\n| --- | --- |\n", ...groups].join("\n")

const rulePages = (markdown: string) =>
    sitePages(markdown, { base: siteBase }).filter((page) => page.kind === "rule")

const group = (title: string, ...sections: string[]) => [`## ${title}\n`, ...sections].join("\n")

test("each rule section becomes a page named after the rule, in the group of its section", () => {
    const markdown = rulesMarkdown(
        group("Error channel", ruleSection("no-effect-promise"), ruleSection("try-object-form")),
        group("Tagged values", ruleSection("no-manual-discriminant-comparison")),
    )

    const pages = rulePages(markdown)

    assert.deepEqual(
        pages.map(({ id, title, group }) => ({ id, title, group })),
        [
            { id: "rules/no-effect-promise", title: "no-effect-promise", group: "Error channel" },
            { id: "rules/try-object-form", title: "try-object-form", group: "Error channel" },
            {
                id: "rules/no-manual-discriminant-comparison",
                title: "no-manual-discriminant-comparison",
                group: "Tagged values",
            },
        ],
    )
})

test("a rule page carries the section body without the back link to the rules index", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise", { intent: "**Intent**: lift with tryPromise." }),
        ),
    )

    const [page] = rulePages(markdown)

    assert.equal(
        page?.body,
        [
            "**Intent**: lift with tryPromise.",
            wellFormedFields.example,
            wellFormedFields.trigger,
            wellFormedFields.exemptions,
            wellFormedFields.why,
            wellFormedFields.options,
            wellFormedFields.fix,
        ].join("\n\n") + "\n",
    )
})

test("a heading-like line inside a code example stays in the rule body", () => {
    const example = "```ts\n// no\n## not a heading\nwrong()\n\n// yes\nright()\n```"
    const markdown = rulesMarkdown(
        group("Error channel", ruleSection("no-effect-promise", { example })),
    )

    const [page] = rulePages(markdown)

    assert.match(page?.body ?? "", /## not a heading/u)
})

for (const [field, label] of [
    ["intent", "Intent"],
    ["trigger", "Trigger"],
    ["options", "Options"],
    ["fix", "Fix"],
] as const) {
    test(`a rule section without ${label} fails, naming the rule and the field`, () => {
        const markdown = rulesMarkdown(
            group("Error channel", ruleSection("no-effect-promise", { [field]: null })),
        )

        assert.throws(() => sitePages(markdown, { base: siteBase }), {
            message: `RULES.md, rule \`no-effect-promise\`: missing **${label}**`,
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
    test(`a rule section with ${scenario} fails, naming the rule`, () => {
        const markdown = rulesMarkdown(
            group("Error channel", ruleSection("no-effect-promise", fields)),
        )

        assert.throws(() => sitePages(markdown, { base: siteBase }), {
            message: `RULES.md, rule \`no-effect-promise\`: ${problem}`,
        })
    })
}

test("Options followed by a list and a suggestion Fix with its detail follow the template", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise", {
                options: "**Options**:\n\n- `testFiles`: shared setting.",
                fix: "**Fix**: suggestion that wraps the literal",
            }),
        ),
    )

    const pages = rulePages(markdown)

    assert.equal(pages.length, 1)
})

test("a sibling rule may leave the example, Exemptions and Why to the rule it links to", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("try-object-form", { example: null, exemptions: null, why: null }),
        ),
    )

    const pages = rulePages(markdown)

    assert.deepEqual(
        pages.map(({ id }) => id),
        ["rules/try-object-form"],
    )
})

const pageById = (markdown: string, id: string) =>
    sitePages(markdown, { base: siteBase }).find((page) => page.id === id)

test("Shared settings and Common limits each become a page with the body of their section", () => {
    const markdown = rulesMarkdown(
        "## Common limits\n\n- **Syntax only**: no type information.\n",
        "## Shared settings\n\nDeclared once.\n\n- **`testFiles`**: test globs.\n",
        group("Error channel", ruleSection("no-effect-promise")),
    )

    const pages = [pageById(markdown, "common-limits"), pageById(markdown, "shared-settings")]

    assert.deepEqual(pages, [
        {
            kind: "reference",
            id: "common-limits",
            title: "Common limits",
            body: "- **Syntax only**: no type information.\n",
        },
        {
            kind: "reference",
            id: "shared-settings",
            title: "Shared settings",
            body: "Declared once.\n\n- **`testFiles`**: test globs.\n",
        },
    ])
})

test("the rules index becomes the page at the root of the rules", () => {
    const markdown = [
        "# Rules\n",
        "## Rules index\n\n| Group | Rule |\n| --- | --- |\n\nAll at `warn`.\n",
        group("Error channel", ruleSection("no-effect-promise")),
    ].join("\n")

    const page = pageById(markdown, "rules")

    assert.deepEqual(page, {
        kind: "reference",
        id: "rules",
        title: "Rules index",
        body: "| Group | Rule |\n| --- | --- |\n\nAll at `warn`.\n",
    })
})

test("a link to a rule section points to the page of that rule", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise"),
            ruleSection("try-object-form", {
                intent: "**Intent**: like [`no-effect-promise`](#no-effect-promise).",
            }),
        ),
    )

    const page = pageById(markdown, "rules/try-object-form")

    assert.ok(page?.body.includes("like [`no-effect-promise`](/site/rules/no-effect-promise/)."))
})

test("a link to Shared settings or Common limits points to its page", () => {
    const markdown = rulesMarkdown(
        "## Common limits\n\n- **Syntax only**.\n",
        "## Shared settings\n\n- **`testFiles`**.\n",
        group(
            "Error channel",
            ruleSection("no-effect-promise", {
                options: "**Options**:\n\n- `testFiles`: [shared setting](#shared-settings).",
                exemptions: "**Exemptions and blind spots**: see [limits](#common-limits).",
            }),
        ),
    )

    const page = pageById(markdown, "rules/no-effect-promise")

    assert.ok(page?.body.includes("[shared setting](/site/shared-settings/)"))
    assert.ok(page?.body.includes("[limits](/site/common-limits/)"))
})

test("a link to a group points to the first rule of that group", () => {
    const markdown = rulesMarkdown(
        group("Error channel", ruleSection("no-effect-promise"), ruleSection("try-object-form")),
    ).replace("| --- | --- |\n", "| --- | --- |\n| [Error channel](#error-channel) | |\n")

    const page = pageById(markdown, "rules")

    assert.ok(page?.body.includes("[Error channel](/site/rules/no-effect-promise/)"))
})

test("a link to the rules index points to the rules index page", () => {
    const markdown = rulesMarkdown(
        "## Shared settings\n\nListed in the [rules index](#rules-index).\n",
        group("Error channel", ruleSection("no-effect-promise")),
    )

    const page = pageById(markdown, "shared-settings")

    assert.ok(page?.body.includes("[rules index](/site/rules/)"))
})

test("a link that names RULES.md resolves like a link within it", () => {
    const markdown = rulesMarkdown(
        "## Shared settings\n\nRead by [`no-effect-promise`](RULES.md#no-effect-promise).\n",
        group("Error channel", ruleSection("no-effect-promise")),
    )

    const page = pageById(markdown, "shared-settings")

    assert.ok(page?.body.includes("[`no-effect-promise`](/site/rules/no-effect-promise/)"))
})

test("links outside RULES.md and link-like text in a code example are left as they are", () => {
    const example = "```ts\n// no\nconst x = a[0](#nowhere)\n\n// yes\nright()\n```"
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise", {
                example,
                why: "**Why**: see [Effect](https://effect.website/docs#errors).",
            }),
        ),
    )

    const page = pageById(markdown, "rules/no-effect-promise")

    assert.ok(page?.body.includes("const x = a[0](#nowhere)"))
    assert.ok(page?.body.includes("[Effect](https://effect.website/docs#errors)"))
})

test("a link to a section that has no site page fails, naming the link and where it is", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise", { why: "**Why**: see [gone](#removed-rule)." }),
        ),
    )

    assert.throws(() => sitePages(markdown, { base: siteBase }), {
        message:
            "RULES.md, rule `no-effect-promise`: link `#removed-rule` resolves to no site page",
    })
})
