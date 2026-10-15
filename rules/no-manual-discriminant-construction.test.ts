import { RuleTester } from "oxlint/plugins-dev"

import {
    noManualDiscriminantConstructionRule,
    remedyFor,
} from "./no-manual-discriminant-construction.ts"

const eventDiscriminants = [{ discriminants: ["_tag", "type", "eventType"] }]

const constructionOf = (discriminant: string) => ({
    messageId: "manualConstruction" as const,
    data: { discriminant, remedy: remedyFor(discriminant) },
})

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "no-manual-discriminant-construction",
    noManualDiscriminantConstructionRule,
    {
        valid: [
            // Ported from `anti-slop-no-manual-tagged-construction`, which this rule replaces.
            'Match.when({ _tag: "Ready" }, handleReady);',
            'Match.not({ "_tag": "Pending" });',
            "Ready.make({ value });",
            "new NotFound({ id });",
            "({ _tag: tag, value });",
            // Only `_tag` by default.
            'const payment = { type: "card", amount }',
            { code: 'const order = { status: "paid", amount }', options: eventDiscriminants },
            {
                code: "ResPaymentDeclinedEvent.make({ id: command.paymentId, eventType })",
                options: eventDiscriminants,
            },
            { code: 'const value = { _tag: "Ready" }', options: [{ discriminants: ["type"] }] },
            // Patterns and codec inputs, also nested.
            'Match.when({ payment: { _tag: "Card" } }, fromCard)',
            {
                code: 'match(payment).with({ type: "card" }, fromCard).with({ type: "transfer" }, fromTransfer).exhaustive()',
                options: eventDiscriminants,
            },
            'Schema.decodeUnknownSync(Ready)({ _tag: "Ready", value: 1 })',
            {
                code: 'Schema.decodeUnknownEffect(Events)([{ eventType: "OrderConfirmed", id }])',
                options: eventDiscriminants,
            },
            'Schema.encodeSync(Ready)({ _tag: "Ready", value: 1 })',
        ],
        invalid: [
            // Ported from `anti-slop-no-manual-tagged-construction`, which this rule replaces.
            {
                code: 'const value = { _tag: "Ready", payload };',
                errors: [constructionOf("_tag")],
            },
            {
                code: 'const value = { ["_tag"]: "Ready" };',
                errors: [{ messageId: "manualConstruction" }],
            },
            {
                code: 'const event: PaymentStartedEvent = { eventType: "PaymentStarted", id, payment }',
                options: eventDiscriminants,
                errors: [constructionOf("eventType")],
            },
            {
                code: 'const toPayment = (amount) => ({ type: "transfer", amount })',
                options: eventDiscriminants,
                errors: [constructionOf("type")],
            },
            // Only the arguments of the pattern or codec call are exempt.
            {
                code: 'match(payment).with({ type: "card" }, () => ({ type: "settled", amount }))',
                options: eventDiscriminants,
                errors: [constructionOf("type")],
            },
            {
                code: 'items.with(0, { _tag: "Ready" })',
                errors: [constructionOf("_tag")],
            },
            {
                code: 'Schema.is(Ready)({ _tag: "Ready" })',
                errors: [constructionOf("_tag")],
            },
        ],
    },
)
