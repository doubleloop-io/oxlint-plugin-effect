const isPrerelease = (version: string) => version.includes("-")

// The first tag is the one `publish` registers; the others are added afterwards. Until a stable
// version exists, `latest` follows the newest prerelease so a plain install gets it. A stable
// version also moves `next`, which must never be behind `latest`. This assumes linear releases: a
// stable patch published while `next` holds a prerelease of a later version moves `next` back.
export const distTagsFor = (version: string, publishedVersions: readonly string[]) => {
    if (!isPrerelease(version)) return ["latest", "next"]
    return publishedVersions.some((published) => !isPrerelease(published))
        ? ["next"]
        : ["latest", "next"]
}
