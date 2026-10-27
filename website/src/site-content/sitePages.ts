export type SitePage = {
    id: string
    title: string
    body: string
}

export const sitePages = (markdown: string): SitePage[] => {
    const match = /^# (?<title>.+)\n+(?<body>[\s\S]*)$/u.exec(markdown)
    if (match?.groups === undefined) {
        throw new Error("the Markdown text must start with a `# ` title heading")
    }
    const { title, body } = match.groups
    return [{ id: slug(title), title, body }]
}

const slug = (title: string) =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "")
