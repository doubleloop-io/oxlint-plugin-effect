import { spawnSync } from "node:child_process"

// Run by `pnpm build:w` under `node --watch-path`, which reruns this file on every change to
// the build inputs; a failed build only sets the exit code so the watcher keeps going.
const { status } = spawnSync("pnpm", ["build"], { stdio: "inherit" })
process.exitCode = status ?? 1
