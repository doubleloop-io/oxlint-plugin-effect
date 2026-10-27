const codeFence = /^```/u

export const isCodeFence = (line: string) => codeFence.test(line)

// A fence line counts as inside the code block it opens and outside the one it closes
export const markdownLines = (lines: string[]) => {
    let insideCodeBlock = false
    return lines.map((line) => {
        const isFence = isCodeFence(line)
        if (isFence) insideCodeBlock = !insideCodeBlock
        return { line, isFence, insideCodeBlock }
    })
}
