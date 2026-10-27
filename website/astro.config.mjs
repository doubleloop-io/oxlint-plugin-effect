// @ts-check
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"

export default defineConfig({
    site: "https://doubleloop-io.github.io",
    base: "/oxlint-plugin-effect",
    integrations: [
        starlight({
            title: "oxlint-plugin-effect",
            social: [
                {
                    icon: "github",
                    label: "GitHub",
                    href: "https://github.com/doubleloop-io/oxlint-plugin-effect",
                },
                {
                    icon: "npm",
                    label: "npm",
                    href: "https://www.npmjs.com/package/@doubleloop-io/oxlint-plugin-effect",
                },
                {
                    icon: "comment-alt",
                    label: "Issues",
                    href: "https://github.com/doubleloop-io/oxlint-plugin-effect/issues",
                },
            ],
            customCss: [
                "@fontsource-variable/inter",
                "@fontsource-variable/jetbrains-mono",
                "./src/styles/theme.css",
            ],
            sidebar: [
                {
                    label: "Guides",
                    items: [{ label: "Example Guide", slug: "guides/example" }],
                },
                {
                    label: "Reference",
                    items: [{ autogenerate: { directory: "reference" } }],
                },
            ],
        }),
    ],
})
