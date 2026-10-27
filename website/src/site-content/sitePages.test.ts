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

const backLink = "<sup>[↑ rules index](#rules-index)</sup>"

const ruleSection = (name: string, fields: Partial<Record<keyof RuleFields, string | null>> = {}) =>
    [`### \`${name}\``, backLink, ...Object.values({ ...wellFormedFields, ...fields })]
        .filter((block) => block !== null)
        .join("\n\n") + "\n"

const rulesMarkdown = (...groups: string[]) =>
    ["# Rules\n", "## Rules index\n\n| Group | Rule |\n| --- | --- |\n", ...groups].join("\n")

const group = (title: string, ...sections: string[]) => [`## ${title}\n`, ...sections].join("\n")

test("each rule section becomes a page named after the rule, in the group of its section", () => {
    const markdown = rulesMarkdown(
        group("Error channel", ruleSection("no-effect-promise"), ruleSection("try-object-form")),
        group("Tagged values", ruleSection("no-manual-discriminant-comparison")),
    )

    const pages = sitePages(markdown)

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

    const [page] = sitePages(markdown)

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

    const [page] = sitePages(markdown)

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

        assert.throws(() => sitePages(markdown), {
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

        assert.throws(() => sitePages(markdown), {
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

    const pages = sitePages(markdown)

    assert.equal(pages.length, 1)
})

test("a sibling rule may leave the example, Exemptions and Why to the rule it links to", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("try-object-form", { example: null, exemptions: null, why: null }),
        ),
    )

    const pages = sitePages(markdown)

    assert.deepEqual(
        pages.map(({ id }) => id),
        ["rules/try-object-form"],
    )
})
