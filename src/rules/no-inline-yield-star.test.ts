import { RuleTester } from "oxlint/plugins-dev"

import { noInlineYieldStarRule } from "./no-inline-yield-star.ts"

new RuleTester().run("no-inline-yield-star", noInlineYieldStarRule, {
    valid: [
        "function* g() { const sheet = yield* readSheet(); return yield* missingIn(sheet) }",
        "function* g() { yield* Effect.logInfo('fatto') }",
        "function* g() { let rows; rows = yield* reader.rows }",
        "function* g() { if (yield* isKnown(name)) return name }",
        "function* g() { for (const row of yield* reader.rows) yield* write(row) }",
        "function* g() { return yield* Effect.forEach(names, Effect.fn('search')(function* (name) { return yield* search(name) })) }",
        "function* g() { return f(yield value) }",
        "function* g() { return ready ? yield* reader.rows : [] }",
        "function* g() { return cached ?? (yield* reader.rows) }",
        "function* g() { const rows = cached || (yield* reader.rows) }",
        "function* g() { ready && (yield* Effect.logInfo('fatto')) }",
        "function* g() { return ready ? (cached ?? (yield* reader.rows)) : yield* new NotReady() }",
    ],
    invalid: [
        {
            code: "function* g() { return yield* missingIn(yield* readSheet()) }",
            output: "function* g() { const sheet = yield* readSheet(); return yield* missingIn(sheet) }",
            errors: [{ messageId: "inlineYieldStar" }],
        },
        {
            code: `function* g() {
    const reader = yield* SheetReader
    return yield* Effect.fromResult(parseSheet(yield* reader.rows))
}`,
            output: `function* g() {
    const reader = yield* SheetReader
    const rows = yield* reader.rows
    return yield* Effect.fromResult(parseSheet(rows))
}`,
            errors: [{ messageId: "inlineYieldStar" }],
        },
        {
            code: "function* g() { yield* Effect.log(yield* reader.rows, yield* list.names) }",
            output: "function* g() { const rows = yield* reader.rows; const names = yield* list.names; yield* Effect.log(rows, names) }",
            errors: [{ messageId: "inlineYieldStar" }, { messageId: "inlineYieldStar" }],
        },
        {
            code: "function* g() { return summarize(yield* loadSummary(yield* reader.rows)) }",
            output: "function* g() { const rows = yield* reader.rows; const summary = yield* loadSummary(rows); return summarize(summary) }",
            errors: [{ messageId: "inlineYieldStar" }, { messageId: "inlineYieldStar" }],
        },
        {
            code: "function* g() { const size = (yield* reader.rows).length }",
            output: "function* g() { const rows = yield* reader.rows; const size = rows.length }",
            errors: [{ messageId: "inlineYieldStar" }],
        },
        {
            code: "function* g() { return { total: (yield* reader.rows) + `${yield* list.names}` } }",
            output: "function* g() { const rows = yield* reader.rows; const names = yield* list.names; return { total: rows + `${names}` } }",
            errors: [{ messageId: "inlineYieldStar" }, { messageId: "inlineYieldStar" }],
        },
        {
            code: "function* g(rows) { return count(yield* reader.rows, rows) }",
            output: "function* g(rows) { const rows2 = yield* reader.rows; return count(rows2, rows) }",
            errors: [{ messageId: "inlineYieldStar" }],
        },
        {
            code: "function* g() { return yield* Effect.succeed(yield* Effect.void) }",
            output: "function* g() { const value = yield* Effect.void; return yield* Effect.succeed(value) }",
            errors: [{ messageId: "inlineYieldStar" }],
        },
        {
            code: `function* g() {
    [yield* reader.rows].forEach(print)
}`,
            output: `function* g() {
    const rows = yield* reader.rows
    ;[rows].forEach(print)
}`,
            errors: [{ messageId: "inlineYieldStar" }],
        },
        {
            code: "function* g() { return (yield* reader.rows) ?? [] }",
            output: "function* g() { const rows = yield* reader.rows; return rows ?? [] }",
            errors: [{ messageId: "inlineYieldStar" }],
        },
        ...[
            "function* g() { while (!(yield* done)) yield* step() }",
            "function* g() { if (ready) return count(yield* reader.rows) }",
            "function* g() { return count(log(), yield* reader.rows) }",
            "function* g() { const first = yield* head, rest = tail(yield* reader.rows) }",
            "function* g() { return reader?.count(yield* reader.rows) }",
            "function* g() { return count(ready ? yield* reader.rows : []) }",
            "function* g() { return (cached ?? (yield* reader.rows)).length }",
        ].map((code) => ({ code, output: null, errors: [{ messageId: "inlineYieldStar" }] })),
    ],
})
