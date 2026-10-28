import { RuleTester } from "oxlint/plugins-dev"

import { noAsymmetricMatchHandlersRule } from "./no-asymmetric-match-handlers.ts"

new RuleTester().run("no-asymmetric-match-handlers", noAsymmetricMatchHandlersRule, {
    valid: [
        "const layer = Option.match(csv, { onNone: () => GoogleSheet.readerLayer, onSome: CsvSheetReader.layer })",
        "const found = Option.match(only, { onNone: () => missingIn(sheet), onSome: (name) => onlyCandidate(sheet, name) })",
        "const label = Option.match(after, { onNone: () => 'in testa', onSome: (name) => `dopo ${name}` })",
        "const rows = SectionAction.$match(action, { UseExistingSection: () => [], CreateSection: ({ header }) => { const row = format(header); return [row] } })",
        "const json = Match.valueTags(source, { InlineJson: ({ json }) => Effect.succeed(json), FilePath: ({ path }) => readKeyFile(path) })",
        "const found = Option.match(only, { onNone: Effect.fn('all')(function* () { return yield* all }), onSome: Effect.fn('one')(function* (name) { return [name] }) })",
        "const cell = Option.match(url, { onNone: () => { return cell(name) }, onSome: (url) => linkedCell(name, url) })",
    ],
    invalid: [
        {
            code: "const found = Option.match(only, { onNone: () => missingIn(sheet), onSome: Effect.fn('onlyCandidate')(function* (name) { const wanted = missingRaces([name], sheet); return wanted }) })",
            errors: [{ messageId: "inlineHandler", data: { hint: " (`onlyCandidate`)" } }],
        },
        {
            code: "const run = Result.match(parsed, { onFailure: usageError, onSuccess: (command) => { log(command); return execute(command) } })",
            errors: [{ messageId: "inlineHandler", data: { hint: "" } }],
        },
        {
            code: "const run = Command.$match(command, { Missing: printMissing, Fill: ({ only }) => Effect.gen(function* () { return yield* fill(only) }) })",
            errors: [{ messageId: "inlineHandler", data: { hint: "" } }],
        },
        {
            code: "const run = Command.$match(command, { Missing: () => printMissing(), Fill: function* () { yield* fill() }, Plan: () => { const a = 1; return a } })",
            errors: [{ messageId: "inlineHandler" }, { messageId: "inlineHandler" }],
        },
    ],
})
