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
            ],
            sidebar: [{ slug: "demo" }],
        }),
    ],
})
