import { execFileSync, spawn } from "node:child_process"
import { randomUUID } from "node:crypto"

// Pinned, so every agent of a comparison runs the same Claude Code; bump it on purpose.
export const claudeVersion = "2.1.330"

export const imageTag = `oxlint-plugin-effect-eval:claude-${claudeVersion}`

const imageExists = () => {
    try {
        execFileSync("docker", ["image", "inspect", imageTag], { stdio: "ignore" })
        return true
    } catch {
        return false
    }
}

export const ensureImage = (contextDir: string) => {
    if (imageExists()) return
    execFileSync(
        "docker",
        ["build", "--build-arg", `CLAUDE_VERSION=${claudeVersion}`, "-t", imageTag, contextDir],
        { stdio: "inherit" },
    )
}

export type ContainerRun = {
    // Mounted read-write at /work.
    readonly workDir: string
    // Mounted read-only at /work/node_modules, shared by the runs of a variant.
    readonly nodeModulesDir: string
    readonly command: readonly string[]
    readonly network: boolean
    readonly envFile?: string
    readonly timeoutMs: number
}

export type ContainerResult = {
    readonly exitCode: number | null
    readonly stdout: string
    readonly stderr: string
    readonly timedOut: boolean
}

const owner = () => {
    const uid = process.getuid?.()
    const gid = process.getgid?.()
    if (uid === undefined || gid === undefined) throw new Error("evals need a POSIX host")
    return `${uid}:${gid}`
}

// A throwaway container, as the host user so the files it writes stay the user's, with a home
// in /tmp that disappears with it.
export const runContainer = (run: ContainerRun) =>
    new Promise<ContainerResult>((resolve, reject) => {
        const name = `oxlint-plugin-effect-eval-${randomUUID()}`
        const args = [
            "run",
            "--rm",
            "--name",
            name,
            "--user",
            owner(),
            "--env",
            "HOME=/tmp/home",
            "--volume",
            `${run.workDir}:/work`,
            "--volume",
            `${run.nodeModulesDir}:/work/node_modules:ro`,
            "--workdir",
            "/work",
            ...(run.network ? [] : ["--network", "none"]),
            ...(run.envFile === undefined ? [] : ["--env-file", run.envFile]),
            imageTag,
            "sh",
            "-c",
            'mkdir -p "$HOME" && exec "$@"',
            "sh",
            ...run.command,
        ]
        const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] })
        let stdout = ""
        let stderr = ""
        let timedOut = false
        child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk))
        child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk))
        const timer = setTimeout(() => {
            timedOut = true
            try {
                execFileSync("docker", ["kill", name], { stdio: "ignore" })
            } catch {
                // It exited meanwhile.
            }
        }, run.timeoutMs)
        child.on("error", (error) => {
            clearTimeout(timer)
            reject(error)
        })
        child.on("close", (exitCode) => {
            clearTimeout(timer)
            resolve({ exitCode, stdout, stderr, timedOut })
        })
    })
