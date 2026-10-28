import assert from "node:assert/strict"
import { test } from "node:test"

import { type GuideFile } from "./sitePages.ts"
import { guideFile, pagesOf, ruleFile, rulesIndexFile } from "./sourceMarkdownBuilders.ts"

const pageById = (userGuide: GuideFile[], id: string) =>
    pagesOf(userGuide).find((page) => page.id === id)

test("a link from a rule file to a sibling rule file points to the page of that rule", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise", "try-object-form"),
        ruleFile("no-effect-promise", {
            fields: { intent: "**Intent**: lift with [`Effect.tryPromise`](try-object-form.md)." },
        }),
        ruleFile("try-object-form"),
    ]

    const page = pageById(userGuide, "rules/no-effect-promise")

    assert.ok(page?.body.includes("[`Effect.tryPromise`](/site/rules/try-object-form/)."))
})

test("a link from a rule file to a guide file points to its page", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        ruleFile("no-effect-promise", {
            fields: {
                options: "**Options**:\n\n- `testFiles`: [shared setting](../shared-settings.md).",
            },
        }),
        guideFile("shared-settings.md"),
    ]

    const page = pageById(userGuide, "rules/no-effect-promise")

    assert.ok(page?.body.includes("[shared setting](/site/shared-settings/)"))
})

test("a link from a guide file to a rule file points to the page of that rule", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        ruleFile("no-effect-promise"),
        guideFile("common-limits.md", {}, "See [this](rules/no-effect-promise.md).\n"),
    ]

    const page = pageById(userGuide, "common-limits")

    assert.equal(page?.body, "See [this](/site/rules/no-effect-promise/).\n")
})

test("a link from a rule file to a repository file with no page points to that file on the main branch", () => {
    const userGuide = [
        rulesIndexFile("anti-slop-prefer-effect-match"),
        ruleFile("anti-slop-prefer-effect-match", {
            fields: { why: "**Why**: see the [license](../../../LICENSE.anti-slop)." },
        }),
    ]

    const page = pageById(userGuide, "rules/anti-slop-prefer-effect-match")

    assert.ok(
        page?.body.includes(
            "[license](https://github.com/owner/the-plugin/blob/main/LICENSE.anti-slop)",
        ),
    )
})

test("a link from a rule file to a missing rule file fails the build, naming the file and the link", () => {
    const userGuide = [
        rulesIndexFile("no-effect-promise"),
        ruleFile("no-effect-promise", { fields: { why: "**Why**: see [gone](removed-rule.md)." } }),
    ]

    assert.throws(() => pagesOf(userGuide), {
        message:
            "docs/user-guide/rules/no-effect-promise.md: link `removed-rule.md` resolves to no site page",
    })
})
