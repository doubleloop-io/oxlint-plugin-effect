const isPrerelease = (version: string) => version.includes("-")

// The first tag is the one `publish` registers; the others are added afterwards. Until a stable
// version exists, `latest` follows the newest prerelease so a plain install gets it.
export const distTagsFor = (version: string, publishedVersions: readonly string[]) => {
    if (!isPrerelease(version)) return ["latest"]
    return publishedVersions.some((published) => !isPrerelease(published))
        ? ["next"]
        : ["latest", "next"]
}
