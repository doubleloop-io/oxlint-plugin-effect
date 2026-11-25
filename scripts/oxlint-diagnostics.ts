export type Diagnostic = {
    readonly code: string
    readonly filename: string
    readonly line: number | undefined
    readonly message: string
}

type RawDiagnostic = {
    code: string
    filename: string
    message: string
    labels: { span: { line: number } }[]
}

const isRawDiagnostic = (value: unknown): value is RawDiagnostic =>
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    "filename" in value &&
    typeof value.filename === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    "labels" in value &&
    Array.isArray(value.labels)

// The diagnostics of `oxlint --format json`.
export const parseDiagnostics = (output: string): Diagnostic[] => {
    const parsed: unknown = JSON.parse(output)
    const diagnostics =
        typeof parsed === "object" && parsed !== null && "diagnostics" in parsed
            ? parsed.diagnostics
            : undefined
    if (!Array.isArray(diagnostics) || !diagnostics.every(isRawDiagnostic)) {
        throw new Error(`unexpected \`oxlint --format json\` output: ${output}`)
    }
    return diagnostics.map(({ code, filename, message, labels }) => ({
        code,
        filename,
        line: labels[0]?.span.line,
        message,
    }))
}
