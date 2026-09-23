import { RuleTester } from "oxlint/plugins-dev"

import { redactedSecretNamesRule } from "./redacted-secret-names.ts"

new RuleTester().run("redacted-secret-names", redactedSecretNamesRule, {
    valid: [
        'const token = Config.redacted("API_TOKEN")',
        'const key = Config.schema(Schema.Redacted(NonBlank), "GOOGLE_SERVICE_ACCOUNT_JSON")',
        'const key = Config.redacted(Config.string("API_KEY"))',
        'const sheet = Config.string("SHEET_ID")',
    ],
    invalid: [
        {
            code: 'const key = Config.string("API_KEY")',
            errors: [{ messageId: "notRedacted", data: { name: "API_KEY" } }],
        },
        {
            code: 'const key = Config.schema(NonBlank, "GOOGLE_SERVICE_ACCOUNT_JSON")',
            errors: [{ messageId: "notRedacted", data: { name: "GOOGLE_SERVICE_ACCOUNT_JSON" } }],
        },
        {
            code: 'const password = Config.nonEmptyString("DB_PASSWORD")',
            errors: [{ messageId: "notRedacted", data: { name: "DB_PASSWORD" } }],
        },
    ],
})
