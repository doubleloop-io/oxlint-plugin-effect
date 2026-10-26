import { readdirSync, readFileSync } from "node:fs"
import { dirname, relative, resolve, sep } from "node:path"

import { defineRule } from "@oxlint/plugins"

import { isEntryFile } from "../shared/entry-files.ts"
import { isTestFile } from "../shared/test-files.ts"

type Deps = {
    readonly isAdapterDir: (dir: string) => boolean
}

// Only the APIs that build a service implementation, so composition of existing layers
// (`mergeAll`, `provide`, `merge`) leaves the entry point out. Longest names first: the
// alternation is ordered, and `effect` would otherwise shadow `effectContext`.
// `scoped*`, `context`, `service` and `function` exist in Effect 3 only; `unwrap` and
// `mock` in Effect 4 only. Naming the API instead of the binding keeps `FooLive` covered.
const LAYER_CONSTRUCTORS = [
    "effectContext",
    "effectDiscard",
    "succeedContext",
    "scopedContext",
    "scopedDiscard",
    "syncContext",
    "function",
    "service",
    "context",
    "succeed",
    "scoped",
    "effect",
    "unwrap",
    "sync",
    "mock",
]

// Like the other rules, names are matched literally: `import * as L from "effect/Layer"` escapes.
const LAYER_CONSTRUCTION = new RegExp(`\\bLayer\\.(?:${LAYER_CONSTRUCTORS.join("|")})\\s*\\(`, "u")

// An Effect 3 `Effect.Service` always carries its implementation and the `Default` layer built
// from it, so a file that declares one is an adapter even without a `Layer.*` call.
const EFFECT_SERVICE = /\bEffect\.Service\s*[<(]/u

export const buildsLayer = (source: string) =>
    LAYER_CONSTRUCTION.test(source) || EFFECT_SERVICE.test(source)

// Test files are skipped so a fixture layer cannot promote a domain directory to an adapter.
const isSource = (entry: string) => entry.endsWith(".ts") && !entry.endsWith(".test.ts")

const buildsLayerIn = (dir: string) => {
    try {
        return readdirSync(dir)
            .filter(isSource)
            .some((entry) => buildsLayer(readFileSync(resolve(dir, entry), "utf8")))
    } catch {
        return false
    }
}

const cachedBuildsLayerIn = () => {
    const known = new Map<string, boolean>()
    return (dir: string) => {
        const seen = known.get(dir)
        if (seen !== undefined) return seen
        const verdict = buildsLayerIn(dir)
        known.set(dir, verdict)
        return verdict
    }
}

const isRelativeImport = (source: string) => source.startsWith("./") || source.startsWith("../")

const toPosix = (path: string) => path.split(sep).join("/")

export const makeAdapterImportBoundaryRule = (deps: Deps) =>
    defineRule({
        meta: {
            type: "problem",
            docs: {
                description:
                    "Import adapters only at the entry point, and never from another adapter. Entry and test files are skipped.",
            },
            messages: {
                adapterOutsideEntry:
                    "`{{adapter}}` is an adapter: depend on its port instead and let the entry point provide the Layer.",
                crossAdapter:
                    "`{{adapter}}` is another adapter: depend on its port instead and let the entry point compose the Layers.",
            },
            schema: [],
        },
        create(context) {
            const ownDir = dirname(context.filename)
            // A test composes the Layers it exercises, so it is an entry point too.
            const composesLayers = isEntryFile(context) || isTestFile(context)

            return {
                ImportDeclaration(node) {
                    const source = node.source.value
                    if (composesLayers || !isRelativeImport(source)) return

                    const targetDir = dirname(resolve(ownDir, source))
                    if (targetDir === ownDir || !deps.isAdapterDir(targetDir)) return

                    context.report({
                        node,
                        messageId: deps.isAdapterDir(ownDir)
                            ? "crossAdapter"
                            : "adapterOutsideEntry",
                        data: { adapter: toPosix(relative(context.cwd, targetDir)) },
                    })
                },
            }
        },
    })

export const adapterImportBoundaryRule = makeAdapterImportBoundaryRule({
    isAdapterDir: cachedBuildsLayerIn(),
})
