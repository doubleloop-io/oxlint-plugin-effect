import { RuleTester } from "oxlint/plugins-dev"

import { exportedSchemaIdentifierRule } from "./exported-schema-identifier.ts"

const paymentError = (annotation: string) =>
    `export const PaymentRegisteredError = Schema.Struct({
        type: Schema.tag("error"),
        message: Schema.String,
    })${annotation}`

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "exported-schema-identifier",
    exportedSchemaIdentifierRule,
    {
        valid: [
            paymentError('.pipe(Schema.annotate({ identifier: "PaymentRegisteredError" }))'),
            paymentError('.annotate({ identifier: "PaymentRegisteredError" })'),
            paymentError(
                '.annotate({ identifier: "PaymentRegisteredError" }).check(Schema.isMinLength(1))',
            ),
            'export const Prices = Schema.Array(Price).pipe(Schema.annotate({ "identifier": "Prices" }))',
            "export const Events = Schema.Union([Created, Deleted]).annotate({ identifier: `Events` })",
            "export const Events = Schema.Union([Created, Deleted]).annotate({ identifier: eventsId })",
            "const Fragment = Schema.Struct({ id: Schema.String })",
            'export class Invoice extends Schema.Class<Invoice>("Invoice")({ id: Schema.String }) {}',
            'export const PriceId = Schema.String.pipe(Schema.brand("PriceId"))',
            "export const decodeEvents = Schema.decodeUnknownEffect(Events)",
            // Effect 3.
            paymentError('.annotations({ identifier: "PaymentRegisteredError" })'),
            paymentError('.pipe(Schema.annotations({ identifier: "PaymentRegisteredError" }))'),
        ],
        invalid: [
            {
                code: "export const EventBusEvents = Schema.Union([Created, Deleted])",
                errors: [
                    {
                        messageId: "missingIdentifier",
                        data: { name: "EventBusEvents" },
                        suggestions: [
                            {
                                messageId: "addIdentifier",
                                data: {
                                    name: "EventBusEvents",
                                    version: "v3",
                                    method: "annotations",
                                },
                                output: 'export const EventBusEvents = Schema.Union([Created, Deleted]).annotations({ identifier: "EventBusEvents" })',
                            },
                            {
                                messageId: "addIdentifier",
                                data: { name: "EventBusEvents", version: "v4", method: "annotate" },
                                output: 'export const EventBusEvents = Schema.Union([Created, Deleted]).annotate({ identifier: "EventBusEvents" })',
                            },
                        ],
                    },
                ],
            },
            {
                code: paymentError('.annotations({ title: "Payment" })'),
                errors: [{ messageId: "missingIdentifier" }],
            },
            {
                code: paymentError(""),
                errors: [{ messageId: "missingIdentifier" }],
            },
            {
                code: "export const Prices = Schema.Array(Price)",
                errors: [{ messageId: "missingIdentifier" }],
            },
            {
                code: paymentError(
                    '.pipe(Schema.annotate({ description: "registration failed" }))',
                ),
                errors: [{ messageId: "missingIdentifier" }],
            },
            {
                code: 'export const PaymentError = Schema.Struct({}).annotate({ identifier: "PaymentRegisteredError" })',
                errors: [
                    {
                        messageId: "wrongIdentifier",
                        data: { name: "PaymentError", identifier: "PaymentRegisteredError" },
                        suggestions: [
                            {
                                messageId: "renameIdentifier",
                                data: { name: "PaymentError" },
                                output: 'export const PaymentError = Schema.Struct({}).annotate({ identifier: "PaymentError" })',
                            },
                        ],
                    },
                ],
            },
        ],
    },
)
