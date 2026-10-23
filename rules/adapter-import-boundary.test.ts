import assert from "node:assert/strict"
import { test } from "node:test"

import { RuleTester } from "oxlint/plugins-dev"

import { buildsLayer, makeAdapterImportBoundaryRule } from "./adapter-import-boundary.ts"

void test("a directory is an adapter when a file builds a Layer, whatever the binding is named", () => {
    assert.ok(buildsLayer("export const GoogleSheetLive = Layer.effect(SheetReader, make)"))
    assert.ok(buildsLayer("const anonymous = Layer.succeed(Tag, value)"))
    assert.ok(buildsLayer("export const layer = Layer.effectContext(build)"))
    assert.ok(buildsLayer("export const repo = Layer.scoped(Repo, acquire)"))
})

void test("an Effect 3 Effect.Service makes a directory an adapter", () => {
    assert.ok(
        buildsLayer(
            'export class Repo extends Effect.Service<Repo>()("Repo", { effect: make }) {}',
        ),
    )
})

void test("composing existing Layers does not make a directory an adapter", () => {
    assert.ok(
        !buildsLayer("const fillLayer = Layer.mergeAll(FileRaceList.layer, GoogleSheet.layer)"),
    )
    assert.ok(!buildsLayer("const wired = program.pipe(Layer.provide(base))"))
    assert.ok(!buildsLayer("const stderrLogger = Logger.layer([sink])"))
    assert.ok(!buildsLayer("const nothing = Layer.empty"))
})

const adapterDirs = ["src/sheet/google", "src/sheet/print", "src/races/file", "src/agent/process"]

const rule = makeAdapterImportBoundaryRule({
    isAdapterDir: (dir) => adapterDirs.some((adapter) => dir.endsWith(adapter)),
})

new RuleTester().run("adapter-import-boundary", rule, {
    valid: [
        {
            code: 'import { SheetReader } from "../SheetReader.ts"',
            filename: "src/sheet/google/GoogleSheet.ts",
        },
        {
            code: 'import { a1Range } from "./a1Range.ts"',
            filename: "src/sheet/google/GoogleSheet.ts",
        },
        {
            code: 'import { GoogleSheet } from "./sheet/google/GoogleSheet.ts"',
            filename: "src/main.ts",
        },
        {
            code: 'import { GoogleSheet } from "./sheet/google/GoogleSheet.ts"',
            filename: "src/start.ts",
            options: [{ entryFiles: ["**/start.ts"] }],
        },
        {
            code: 'import { RaceList } from "../races/RaceList.ts"',
            filename: "src/commands/missing.ts",
        },
        {
            code: 'import { Effect, Layer } from "effect"',
            filename: "src/sheet/google/GoogleSheet.ts",
        },
        {
            code: 'import { agentConfig } from "../../config.ts"',
            filename: "src/agent/process/ProcessAgent.ts",
        },
        {
            code: 'import { GoogleSheet } from "./google/GoogleSheet.ts"',
            filename: "src/sheet/GoogleSheet.integration.test.ts",
        },
        {
            code: 'import { GoogleSheet } from "../google/GoogleSheet.ts"',
            filename: "src/sheet/print/PrintSheet.test.ts",
        },
        {
            code: 'import { GoogleSheet } from "./google/GoogleSheet.ts"',
            filename: "src/sheet/GoogleSheet.check.ts",
            options: [{ testFiles: ["**/*.check.ts"] }],
        },
        // A nested directory that builds no Layer is domain code, whatever its depth.
        {
            code: 'import { formatCells } from "./helpers/formatCells.ts"',
            filename: "src/plan/planRow.ts",
        },
    ],
    invalid: [
        {
            code: 'import * as GoogleSheet from "../sheet/google/GoogleSheet.ts"',
            filename: "src/plan/planRow.ts",
            errors: [{ messageId: "adapterOutsideEntry", data: { adapter: "src/sheet/google" } }],
        },
        {
            code: 'import * as FileRaceList from "../races/file/FileRaceList.ts"',
            filename: "src/commands/fill.ts",
            errors: [{ messageId: "adapterOutsideEntry", data: { adapter: "src/races/file" } }],
        },
        {
            code: 'import * as GoogleSheet from "../../sheet/google/GoogleSheet.ts"',
            filename: "src/agent/process/ProcessAgent.ts",
            errors: [{ messageId: "crossAdapter", data: { adapter: "src/sheet/google" } }],
        },
        {
            code: 'import * as PrintSheetWriter from "../print/PrintSheetWriter.ts"',
            filename: "src/sheet/google/GoogleSheet.ts",
            errors: [{ messageId: "crossAdapter", data: { adapter: "src/sheet/print" } }],
        },
        // `testFiles` replaces the defaults, so a `.test.ts` outside the new globs is checked.
        {
            code: 'import { GoogleSheet } from "../sheet/google/GoogleSheet.ts"',
            filename: "src/plan/planRow.test.ts",
            options: [{ testFiles: ["**/*.check.ts"] }],
            errors: [{ messageId: "adapterOutsideEntry", data: { adapter: "src/sheet/google" } }],
        },
    ],
})
