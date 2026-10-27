import { docsSchema } from "@astrojs/starlight/schema"
import { defineCollection } from "astro:content"

import { sitePagesLoader } from "./site-content/sitePagesLoader.ts"

export const collections = {
    docs: defineCollection({ loader: sitePagesLoader(), schema: docsSchema() }),
}
