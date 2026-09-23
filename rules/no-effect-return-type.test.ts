import { RuleTester } from "oxlint/plugins-dev"

import { noEffectReturnTypeRule } from "./no-effect-return-type.ts"

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "no-effect-return-type",
    noEffectReturnTypeRule,
    {
        valid: [
            "const next = (count: number): number => count + 1",
            "const insertionAt = (section: Section): Insertion => after(section)",
            "const resolveColumns = (header: Row): Result.Result<Columns, SheetColumnMissingError> => Result.all(columnsOf(header))",
            "const missingRaces = (names: ReadonlyArray<string>, sheet: Sheet): ReadonlyArray<string> => names.filter(absentFrom(sheet))",
            "const run = (program: Effect.Effect<void>) => Effect.runPromise(program)",
            "const lookup = (name: string): Effect.Effect<Race, RaceNotFound> => cache.has(name) ? Effect.succeed(cache.get(name)) : Effect.fail(new RaceNotFound({ name }))",
            "const walk = (node: Tree): Effect.Effect<number, WalkError> => Effect.flatMap(childrenOf(node), (children) => Effect.forEach(children, walk))",
        ],
        invalid: [
            {
                code: "const readSheet = (id: string): Effect.Effect<Sheet, SheetReadError, SheetReader> => reader.read(id)",
                errors: [
                    {
                        messageId: "effectReturnType",
                        suggestions: [
                            {
                                messageId: "removeReturnType",
                                output: "const readSheet = (id: string) => reader.read(id)",
                            },
                        ],
                    },
                ],
            },
            {
                code: "const races = (list: RaceList): Stream.Stream<Race, AgentError, Agent> => Stream.fromIterable(list.names).pipe(Stream.mapEffect(search))",
                errors: [{ messageId: "effectReturnType" }],
            },
            {
                code: "const fallback = (name: string): Option.Option<Effect.Effect<Race, AgentError>> => Option.map(cached(name), Effect.succeed)",
                errors: [{ messageId: "effectReturnType" }],
            },
            {
                code: "const searcher = (agent: Agent): ((name: string) => Effect.Effect<Race, AgentError> | Effect.Effect<Race, never>) => (name) => agent.search(name)",
                errors: [{ messageId: "effectReturnType" }],
            },
            {
                code: "function sheetLayer(id: string): Layer.Layer<SheetReader, never, HttpClient> { return Layer.effect(SheetReader, readerFor(id)) }",
                errors: [{ messageId: "effectReturnType" }],
            },
        ],
    },
)
