import assert from "node:assert/strict"
import { test } from "node:test"

import {
    group,
    guideFile,
    pagesOf,
    ruleSection,
    rulesMarkdown,
} from "./sourceMarkdownBuilders.ts"

const pageById = (sources: Parameters<typeof pagesOf>[0], id: string) =>
    pagesOf(sources).find((page) => page.id === id)

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

    const page = pageById({ rulesMd: markdown }, "rules/try-object-form")

    assert.ok(page?.body.includes("like [`no-effect-promise`](/site/rules/no-effect-promise/)."))
})

test("a RULES.md link to a guide file points to its page", () => {
    const rulesMd = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise", {
                options: "**Options**:\n\n- `testFiles`: [shared setting](user-guide/shared-settings.md).",
                exemptions: "**Exemptions and blind spots**: see [limits](user-guide/common-limits.md).",
            }),
        ),
    )
    const userGuide = [guideFile("shared-settings.md"), guideFile("common-limits.md")]

    const page = pageById({ rulesMd, userGuide }, "rules/no-effect-promise")

    assert.ok(page?.body.includes("[shared setting](/site/shared-settings/)"))
    assert.ok(page?.body.includes("[limits](/site/common-limits/)"))
})

test("a link to a group points to the first rule of that group", () => {
    const markdown = rulesMarkdown(
        group("Error channel", ruleSection("no-effect-promise"), ruleSection("try-object-form")),
        group(
            "Tagged values",
            ruleSection("no-manual-discriminant-comparison", {
                why: "**Why**: as in [Error channel](#error-channel).",
            }),
        ),
    )

    const page = pageById({ rulesMd: markdown }, "rules/no-manual-discriminant-comparison")

    assert.ok(page?.body.includes("[Error channel](/site/rules/no-effect-promise/)"))
})

test("a link to the rules index points to the rules overview", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise", { why: "**Why**: see the [rules index](#rules-index)." }),
        ),
    )

    const page = pageById({ rulesMd: markdown }, "rules/no-effect-promise")

    assert.ok(page?.body.includes("[rules index](/site/rules-overview/)"))
})

test("a RULES.md link to a section that has no site page fails, naming the link and the rule", () => {
    const markdown = rulesMarkdown(
        group(
            "Error channel",
            ruleSection("no-effect-promise", { why: "**Why**: see [gone](#removed-rule)." }),
        ),
    )

    assert.throws(() => pagesOf({ rulesMd: markdown }), {
        message:
            "RULES.md, rule `no-effect-promise`: link `#removed-rule` resolves to no site page",
    })
})
