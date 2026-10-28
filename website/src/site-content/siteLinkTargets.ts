import { headingAnchor } from "./internalLinks.ts"
import { publishedSite } from "./publishedSite.ts"

const { base } = publishedSite

export const routeOf = (id: string) => (id === "index" ? `${base}/` : `${base}/${id}/`)

export const pageHeadingAnchors = (body: string) =>
    [...body.matchAll(/^#{1,6} (?<heading>.+)$/gmu)].map(({ groups }) =>
        headingAnchor(groups?.heading ?? ""),
    )
