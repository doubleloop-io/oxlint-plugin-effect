import assert from "node:assert/strict"
import { test } from "node:test"

import {
    group,
    pagesOf,
    readmeMarkdown,
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

    const page = pageById({ rulesMd: markdown }, "rules/no-effect-promise")

    assert.ok(page?.body.includes("[shared setting](/site/shared-settings/)"))
    assert.ok(page?.body.includes("[limits](/site/common-limits/)"))
})

test("a link to a group points to the first rule of that group", () => {
    const markdown = rulesMarkdown(
        group("Error channel", ruleSection("no-effect-promise"), ruleSection("try-object-form")),
    ).replace("| --- | --- |\n", "| --- | --- |\n| [Error channel](#error-channel) | |\n")

    const page = pageById({ rulesMd: markdown }, "rules")

    assert.ok(page?.body.includes("[Error channel](/site/rules/no-effect-promise/)"))
})

test("a link to the rules index points to the rules index page", () => {
    const markdown = rulesMarkdown(
        "## Shared settings\n\nListed in the [rules index](#rules-index).\n",
        group("Error channel", ruleSection("no-effect-promise")),
    )

    const page = pageById({ rulesMd: markdown }, "shared-settings")

    assert.ok(page?.body.includes("[rules index](/site/rules/)"))
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

test("the landing page links to installation and to the rules index", () => {
    const readmeMd = [
        "# @owner/the-plugin\n\nAn oxlint plugin.\n\nIt complements [tsgo](#alongside-effecttsgo).\n",
        "## Installation\n\n```bash\npnpm add -D the-plugin\n```\n",
        "## Configuration\n\n### Alongside `@effect/tsgo`\n\nBoth.\n",
    ].join("\n")

    const page = pageById({ readmeMd }, "index")

    assert.deepEqual(page, {
        kind: "landing",
        id: "index",
        title: "@owner/the-plugin",
        body: "An oxlint plugin.\n\nIt complements [tsgo](/site/configuration/#alongside-effecttsgo).\n",
        actions: [
            { text: "Installation", link: "/site/installation/" },
            { text: "Rules index", link: "/site/rules/" },
        ],
    })
})

test("a link to a README section points to its page, a link to a subsection to its heading there", () => {
    const readmeMd = readmeMarkdown(
        "## Installation\n\nThen [configure](#configuration), [with tsgo](#alongside-effecttsgo).\n",
        "## Configuration\n\nExtend.\n\n### Alongside `@effect/tsgo`\n\nBoth.\n",
    )

    const page = pageById({ readmeMd }, "installation")

    assert.equal(
        page?.body,
        "Then [configure](/site/configuration/), [with tsgo](/site/configuration/#alongside-effecttsgo).\n",
    )
})

test("a link to the Rules section points to the rules overview, apart from the rules index page", () => {
    const readmeMd = readmeMarkdown(
        "## Rules\n\n| Topic | Rules |\n\n### Absorbed from anti-slop\n\nSome rules.\n",
        "## Versioning\n\nSee the [overview](#rules) and [provenance](#absorbed-from-anti-slop).\n",
    )

    const pages = pagesOf({ readmeMd })

    assert.equal(
        pages.find(({ id }) => id === "versioning")?.body,
        "See the [overview](/site/rules-overview/) and [provenance](/site/rules-overview/#absorbed-from-anti-slop).\n",
    )
    assert.equal(pages.find(({ id }) => id === "rules")?.title, "Rules index")
})

test("a link from the README to RULES.md points to the rules index, a link to a rule in it to the rule page", () => {
    const readmeMd = readmeMarkdown(
        "## Versioning\n\nIn [`RULES.md`](RULES.md), such as [this](RULES.md#no-effect-promise).\n",
    )

    const page = pageById({ readmeMd }, "versioning")

    assert.equal(
        page?.body,
        "In [`RULES.md`](/site/rules/), such as [this](/site/rules/no-effect-promise/).\n",
    )
})

test("a link to the Development section fails, as it has no site page", () => {
    const readmeMd = readmeMarkdown(
        "## Versioning\n\nSee [releasing](#development).\n",
        "## Development\n\n- `pnpm release`.\n",
    )

    assert.throws(() => pagesOf({ readmeMd }), {
        message: "README.md, section `Versioning`: link `#development` resolves to no site page",
    })
})
