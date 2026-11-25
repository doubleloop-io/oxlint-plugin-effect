import { readFile } from "node:fs/promises"
import { join } from "node:path"

export type EvalCase = {
    readonly name: string
    readonly code: string
    readonly good: string
    readonly bad: string
}

export type RuleCases = {
    readonly rule: string
    readonly preamble: string
    readonly cases: readonly EvalCase[]
}

type Section = { readonly name: string; readonly line: number; readonly lines: string[] }

type CodeBlock = { readonly lang: string; readonly code: string }

const fence = /^```(\w*)\s*$/

// The `## <name>` sections, ignoring what precedes the first one and headings inside fences.
const sectionsOf = (lines: readonly string[]) => {
    const sections: Section[] = []
    let inFence = false
    lines.forEach((text, index) => {
        const heading = inFence ? null : /^## (.+)$/.exec(text)
        if (fence.test(text)) inFence = !inFence
        if (heading?.[1] !== undefined) {
            sections.push({ name: heading[1].trim(), line: index + 1, lines: [] })
        } else {
            sections.at(-1)?.lines.push(text)
        }
    })
    return sections
}

const codeBlocksOf = (lines: readonly string[]) => {
    const blocks: CodeBlock[] = []
    let open: { lang: string; lines: string[] } | undefined
    for (const text of lines) {
        const match = fence.exec(text)
        if (open === undefined) {
            if (match) open = { lang: match[1] ?? "", lines: [] }
        } else if (match) {
            blocks.push({ lang: open.lang, code: open.lines.join("\n") })
            open = undefined
        } else {
            open.lines.push(text)
        }
    }
    return blocks
}

const proseOf = (lines: readonly string[]) => {
    const prose: string[] = []
    let inFence = false
    for (const text of lines) {
        if (fence.test(text)) inFence = !inFence
        else if (!inFence) prose.push(text)
    }
    return prose
}

const rubricLine = (prose: readonly string[], label: string) =>
    prose
        .map((text) => new RegExp(`^${label}:\\s*(.+)$`).exec(text)?.[1]?.trim())
        .find((text) => text !== undefined)

const singleTsBlock = (section: Section, where: string) => {
    const blocks = codeBlocksOf(section.lines)
    const [block] = blocks
    if (blocks.length !== 1 || block?.lang !== "ts") {
        throw new Error(`${where}: section "${section.name}" needs exactly one \`ts\` code block`)
    }
    return block.code
}

export const parseRuleCases = (rule: string, markdown: string, file: string): RuleCases => {
    let preamble = ""
    const cases: EvalCase[] = []
    for (const section of sectionsOf(markdown.split("\n"))) {
        const where = `${file}:${section.line}`
        if (section.name === "preamble") {
            preamble = singleTsBlock(section, where)
            continue
        }
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(section.name)) {
            throw new Error(`${where}: case name "${section.name}" is not kebab-case`)
        }
        if (cases.some(({ name }) => name === section.name)) {
            throw new Error(`${where}: case "${section.name}" appears twice`)
        }
        const prose = proseOf(section.lines)
        const good = rubricLine(prose, "Good")
        const bad = rubricLine(prose, "Bad")
        if (good === undefined || bad === undefined) {
            throw new Error(
                `${where}: case "${section.name}" needs a \`Good:\` and a \`Bad:\` line`,
            )
        }
        cases.push({ name: section.name, code: singleTsBlock(section, where), good, bad })
    }
    if (cases.length === 0) throw new Error(`${file}: no case`)
    return { rule, preamble, cases }
}

export const loadRuleCases = async (evalsDir: string, rule: string) => {
    const file = join(evalsDir, `${rule}.md`)
    return parseRuleCases(rule, await readFile(file, "utf8"), file)
}

export const selectCase = (ruleCases: RuleCases, name: string | undefined): RuleCases => {
    if (name === undefined) return ruleCases
    const selected = ruleCases.cases.filter((evalCase) => evalCase.name === name)
    if (selected.length === 0) {
        const names = ruleCases.cases.map((evalCase) => evalCase.name).join(", ")
        throw new Error(`rule ${ruleCases.rule} has no case "${name}" (cases: ${names})`)
    }
    return { ...ruleCases, cases: selected }
}
