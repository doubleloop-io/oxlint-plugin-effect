import { isCodeFence, markdownLines } from "./markdownLines.ts"

const requiredFields = ["Intent", "Trigger", "Options", "Fix"]
const fieldLabel = /^\*\*(?<label>[^*]+)\*\*:/u

// What breaks the catalog template in a rule file body, undefined when it follows the template
export const ruleTemplateProblem = (body: string) => {
    const lines = body.split("\n")
    const prose = proseLines(lines)
    const fields = new Map(
        prose.flatMap((line, index) => {
            const label = fieldLabel.exec(line)?.groups?.label
            const value = line.replace(fieldLabel, "").trim()
            return label === undefined ? [] : [[label, { value, index }] as const]
        }),
    )
    const missing = requiredFields.find((field) => !fields.has(field))
    if (missing !== undefined) return `missing **${missing}**`

    if (!fixValue.test(fields.get("Fix")?.value ?? "")) {
        return "**Fix** is not none, autofix or suggestion"
    }
    const options = fields.get("Options")
    const lineAfterOptions = prose.slice((options?.index ?? 0) + 1).find((line) => line !== "")
    const optionsAreListed = options?.value === "" && lineAfterOptions?.startsWith("- ")
    if (options?.value !== "none" && !optionsAreListed) {
        return "**Options** is neither none nor followed by a list"
    }
    return exampleProblem(lines)
}

const fixValue = /^(none|autofix|suggestion\b)/u

const exampleProblem = (lines: string[]) => {
    const start = lines.findIndex(isCodeFence)
    if (start === -1) return undefined
    const end = lines.findIndex((line, index) => index > start && isCodeFence(line))
    const example = lines.slice(start + 1, end)
    if (!example[0]?.startsWith("// no")) return "the example does not start with `// no`"
    if (!example.some((line) => line.startsWith("// yes"))) return "the example has no `// yes`"
    return undefined
}

const proseLines = (lines: string[]) =>
    markdownLines(lines).map(({ line, isFence, insideCodeBlock }) =>
        insideCodeBlock || isFence ? "```" : line,
    )
