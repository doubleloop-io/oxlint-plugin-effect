import { RuleTester } from "oxlint/plugins-dev"

import { serviceKeyMatchesNameRule } from "./service-key-matches-name.ts"

const geocodingApis = (key: string) =>
    `export class GeocodingApis extends Context.Service<GeocodingApis, GeocodingAPIsFields>()(${key}) {}`

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "service-key-matches-name",
    serviceKeyMatchesNameRule,
    {
        valid: [
            'export class PriceSimulator extends Context.Service<PriceSimulator, PriceSimulatorShape>()("PriceSimulator") {}',
            'class Database extends Context.Service<Database, Shape>()("myapp/db/Database") {}',
            "class Database extends Context.Service<Database, Shape>()(`Database`) {}",
            'const Database = class extends Context.Service<Database, Shape>()("Database") {}',
            // Keys that are not literals are not compared.
            "class Database extends Context.Service<Database, Shape>()(databaseKey) {}",
            "class Database extends Context.Service<Database, Shape>()(`${prefix}/Database`) {}",
            // Only the class form: the variable form belongs to `service-not-as-class` (effecttsgo).
            'const Database = Context.Service<Shape>("Db")',
            'class NotFound extends Schema.TaggedError<NotFound>()("NotFoundError", {}) {}',
        ],
        invalid: [
            {
                code: geocodingApis('"GeocodingAPIs"'),
                errors: [
                    {
                        messageId: "keyMismatch",
                        data: { key: "GeocodingAPIs", name: "GeocodingApis" },
                        suggestions: [
                            {
                                messageId: "useKey",
                                data: { expected: "GeocodingApis" },
                                output: geocodingApis('"GeocodingApis"'),
                            },
                        ],
                    },
                ],
            },
            {
                code: geocodingApis('"@services/GeocodingAPIs"'),
                errors: [
                    {
                        messageId: "keyMismatch",
                        suggestions: [
                            {
                                messageId: "useKey",
                                data: { expected: "@services/GeocodingApis" },
                                output: geocodingApis('"@services/GeocodingApis"'),
                            },
                        ],
                    },
                ],
            },
            {
                // The name must be the whole last segment, not just its end.
                code: 'class Database extends Context.Service<Database, Shape>()("app/MainDatabase") {}',
                errors: [{ messageId: "keyMismatch" }],
            },
            {
                code: 'const Database = class extends Context.Service<Database, Shape>()("Db") {}',
                errors: [{ messageId: "keyMismatch" }],
            },
        ],
    },
)
