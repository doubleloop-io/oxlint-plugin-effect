// `claude -p` with nothing of the host's configuration: no CLAUDE.md, memory, hooks, plugins,
// MCP servers, skills or commands. The container's home is empty, and these flags also drop
// what Claude Code bundles.
export const isolatedClaude = (options: {
    readonly prompt: string
    readonly model: string
    readonly maxBudgetUsd: number
    readonly extra: readonly string[]
}) => [
    "claude",
    "-p",
    options.prompt,
    "--bare",
    "--model",
    options.model,
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-session-persistence",
    "--max-budget-usd",
    String(options.maxBudgetUsd),
    ...options.extra,
]

// A field of a JSON value, or undefined.
export const field = (value: unknown, name: string): unknown =>
    typeof value === "object" && value !== null
        ? Object.entries(value).find(([key]) => key === name)?.[1]
        : undefined

// The parsed lines of a stream-json output, skipping what is not JSON.
export const jsonLines = (output: string) =>
    output.split("\n").flatMap((line): unknown[] => {
        try {
            return [JSON.parse(line)]
        } catch {
            return []
        }
    })

export const costOf = (result: unknown) => {
    const cost = field(result, "total_cost_usd")
    return typeof cost === "number" ? cost : undefined
}
