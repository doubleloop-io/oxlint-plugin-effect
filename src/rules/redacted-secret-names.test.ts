import { RuleTester } from "oxlint/plugins-dev"

import { redactedSecretNamesRule } from "./redacted-secret-names.ts"

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "redacted-secret-names",
    redactedSecretNamesRule,
    {
        valid: [
            'const token = Config.Redacted("API_TOKEN")',
            'const key = Config.schema(Schema.Redacted(NonBlank), "GOOGLE_SERVICE_ACCOUNT_JSON")',
            'const sheet = Config.String("SHEET_ID")',
            // Effect 3.
            'const token = Config.redacted("API_TOKEN")',
            'const token = Config.redacted(Config.string("API_TOKEN"))',
            "const Session = Schema.Struct({ accessToken: Schema.Redacted(Schema.String) })",
            "const Session = Schema.Struct({ accessToken: Schema.RedactedFromValue(Schema.String) })",
            "const Session = Schema.Struct({ accessToken: Schema.String.pipe(Schema.Redacted) })",
            // A named schema may be `Redacted` already: it is not inspected.
            "const Session = Schema.Struct({ accessToken: AccessToken })",
            // No generic `token`, and a secret name must end the field name.
            "const Page = Schema.Struct({ nextPageToken: Schema.String, tokenType: Schema.String })",
            "const Tenant = Schema.Struct({ passwordPolicy: Schema.String })",
            // Only the fields object of a schema constructor.
            "const credentials = { password: Schema.String }",
            {
                code: "const Session = Schema.Struct({ password: Schema.String })",
                options: [{ secretFields: ["pin"] }],
            },
        ],
        invalid: [
            {
                code: 'const key = Config.String("API_KEY")',
                errors: [{ messageId: "notRedacted", data: { name: "API_KEY" } }],
            },
            {
                code: 'const key = Config.schema(NonBlank, "GOOGLE_SERVICE_ACCOUNT_JSON")',
                errors: [
                    { messageId: "notRedacted", data: { name: "GOOGLE_SERVICE_ACCOUNT_JSON" } },
                ],
            },
            {
                code: 'const password = Config.NonEmptyString("DB_PASSWORD")',
                errors: [{ messageId: "notRedacted", data: { name: "DB_PASSWORD" } }],
            },
            {
                code: "const Session = Schema.Struct({ accessToken: Schema.String, userId: Schema.String })",
                errors: [{ messageId: "fieldNotRedacted", data: { name: "accessToken" } }],
            },
            {
                code: `class Credentials extends Schema.Class<Credentials>("Credentials")({
    "apiKey": Schema.NonEmptyString.check(Schema.isMaxLength(64)),
    dbPassword: Schema.optional(Schema.String),
    clientSecret: Schema.String.pipe(Schema.annotate({ description: "OAuth" })),
}) {}`,
                errors: [
                    { messageId: "fieldNotRedacted", data: { name: "apiKey" } },
                    { messageId: "fieldNotRedacted", data: { name: "dbPassword" } },
                    { messageId: "fieldNotRedacted", data: { name: "clientSecret" } },
                ],
            },
            {
                code: 'const key = Config.string("API_KEY")',
                errors: [{ messageId: "notRedacted", data: { name: "API_KEY" } }],
            },
            {
                // Effect 3 wrappers and annotations.
                code: `const Login = Schema.Struct({
    password: Schema.optionalWith(Schema.String, { exact: true }),
    apiKey: Schema.String.annotations({ description: "key" }),
})`,
                errors: [
                    { messageId: "fieldNotRedacted", data: { name: "password" } },
                    { messageId: "fieldNotRedacted", data: { name: "apiKey" } },
                ],
            },
            {
                // The option replaces the defaults.
                code: "const Card = Schema.Struct({ pin: Schema.String, password: Schema.String })",
                options: [{ secretFields: ["pin"] }],
                errors: [{ messageId: "fieldNotRedacted", data: { name: "pin" } }],
            },
        ],
    },
)
