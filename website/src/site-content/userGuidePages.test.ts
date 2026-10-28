import assert from "node:assert/strict"
import { test } from "node:test"

import { frontmatter, guideFile, guidePagesOf } from "./sourceMarkdownBuilders.ts"

test("a guide file is a guide page with the title of its frontmatter, named after its path", () => {
    const userGuide = [guideFile("versioning.md", { title: "Versioning" }, "Versions are `0.x`.\n")]

    const pages = guidePagesOf(userGuide)

    assert.deepEqual(pages, [
        { kind: "guide", id: "versioning", title: "Versioning", body: "Versions are `0.x`.\n" },
    ])
})

test("the guide index is the landing page: the package scope above its name, the first paragraph as tagline, and actions to installation and the rules overview", () => {
    const userGuide = [
        guideFile(
            "README.md",
            { title: '"@owner/the-plugin"' },
            "An oxlint plugin.\n\nStart from [configuration](configuration.md).\n",
        ),
        guideFile("installation.md"),
        guideFile("configuration.md"),
        guideFile("rules.md"),
    ]

    const landing = guidePagesOf(userGuide).find(({ kind }) => kind === "landing")

    assert.deepEqual(landing, {
        kind: "landing",
        id: "index",
        title: "@owner/the-plugin",
        scope: "@owner/",
        name: "the-plugin",
        tagline: "An oxlint plugin.",
        body: "Start from [configuration](/site/configuration/).\n",
        actions: [
            { text: "Installation", link: "/site/installation/" },
            { text: "Rules overview", link: "/site/rules-overview/" },
        ],
    })
})

test("the rules index is the rules overview page, apart from the route of the rule pages", () => {
    const userGuide = [guideFile("rules.md", { title: "Rules overview" }, "| Topic | Rules |\n")]

    const pages = guidePagesOf(userGuide)

    assert.deepEqual(pages, [
        { kind: "guide", id: "rules-overview", title: "Rules overview", body: "| Topic | Rules |\n" },
    ])
})

test("guide pages follow the order of their frontmatter, then their path, whatever the file order", () => {
    const userGuide = [
        guideFile("zebra.md"),
        guideFile("troubleshooting.md", { order: 2 }),
        guideFile("alpha.md"),
        guideFile("versioning.md", { order: 1 }),
    ]

    const ids = guidePagesOf(userGuide).map(({ id }) => id)

    assert.deepEqual(ids, ["versioning", "troubleshooting", "alpha", "zebra"])
})

test("a relative link to a guide file points to its page, one with an anchor to its heading there", () => {
    const userGuide = [
        guideFile("versioning.md", {}, "See [settings](configuration.md), [rc](configuration.md#release-candidates), [here](#policy).\n\n## Policy\n"),
        guideFile("configuration.md", {}, "## Release candidates\n\nText.\n"),
    ]

    const page = guidePagesOf(userGuide).find(({ id }) => id === "versioning")

    assert.equal(
        page?.body,
        "See [settings](/site/configuration/), [rc](/site/configuration/#release-candidates), [here](/site/versioning/#policy).\n\n## Policy\n",
    )
})

for (const { condition, href } of [
    { condition: "a missing guide file", href: "removed.md" },
    { condition: "a missing heading", href: "configuration.md#removed-heading" },
]) {
    test(`a link to ${condition} fails the build, naming the file and the link`, () => {
        const userGuide = [
            guideFile("versioning.md", {}, `See [this](${href}).\n`),
            guideFile("configuration.md", {}, "## Settings\n"),
        ]

        assert.throws(() => guidePagesOf(userGuide), {
            message: `user-guide/versioning.md: link \`${href}\` resolves to no site page`,
        })
    })
}

test("a relative link to a repository file with no page points to that file on the main branch", () => {
    const userGuide = [guideFile("versioning.md", {}, "See the [license](../LICENSE).\n")]

    const page = guidePagesOf(userGuide).find(({ id }) => id === "versioning")

    assert.equal(page?.body, "See the [license](https://github.com/owner/the-plugin/blob/main/LICENSE).\n")
})

const invalidFrontmatter = [
    { condition: "no frontmatter", content: "Versions are `0.x`.\n", problem: "no frontmatter" },
    {
        condition: "a frontmatter without title",
        content: `${frontmatter({ order: 1 })}\nText.\n`,
        problem: "frontmatter has no `title`",
    },
    {
        condition: "an order that is not an integer",
        content: `${frontmatter({ title: "Versioning", order: "first" })}\nText.\n`,
        problem: "frontmatter `order` is not an integer",
    },
    {
        condition: "a frontmatter line that is not a field",
        content: "---\ntitle: Versioning\njust text\n---\n\nText.\n",
        problem: "frontmatter line `just text` is not `field: value`",
    },
    {
        condition: "an unknown field",
        content: `${frontmatter({ title: "Versioning", sidebar: "hidden" })}\nText.\n`,
        problem: "frontmatter has unknown field `sidebar`",
    },
]

for (const { condition, content, problem } of invalidFrontmatter) {
    test(`a guide file with ${condition} fails the build, naming the file`, () => {
        const userGuide = [{ path: "versioning.md", content }]

        assert.throws(() => guidePagesOf(userGuide), {
            message: `user-guide/versioning.md: ${problem}`,
        })
    })
}
