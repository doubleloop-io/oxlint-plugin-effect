import { RuleTester } from "oxlint/plugins-dev"

import {
    effectVariantOf,
    noManualDiscriminantConstructionRule,
    remedyFor,
} from "./no-manual-discriminant-construction.ts"

const eventDiscriminants = { "dl-effect": { discriminants: ["_tag", "type", "eventType"] } }

const effectVariant = (tag: string) => {
    const data = effectVariantOf(tag)
    if (data === undefined) throw new Error(`${tag} is not a variant of Effect's own types`)
    return { messageId: "effectVariantConstruction" as const, data }
}

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
            { code: 'const order = { status: "paid", amount }', settings: eventDiscriminants },
            {
                code: "ResPaymentDeclinedEvent.make({ id: command.paymentId, eventType })",
                settings: eventDiscriminants,
            },
            {
                code: 'const value = { _tag: "Ready" }',
                settings: { "dl-effect": { discriminants: ["type"] } },
            },
            // Patterns and codec inputs, also nested.
            'Match.when({ payment: { _tag: "Card" } }, fromCard)',
            {
                code: 'match(payment).with({ type: "card" }, fromCard).with({ type: "transfer" }, fromTransfer).exhaustive()',
                settings: eventDiscriminants,
            },
            'Schema.decodeUnknownSync(Ready)({ _tag: "Ready", value: 1 })',
            {
                code: 'Schema.decodeUnknownEffect(Events)([{ eventType: "OrderConfirmed", id }])',
                settings: eventDiscriminants,
            },
            'Schema.encodeSync(Ready)({ _tag: "Ready", value: 1 })',
            // Expected shapes in assertions, also nested.
            'expect(outcome).toMatchObject({ _tag: "Failure", failure: { _tag: "NotReady" } })',
            'expect(refusals).not.toEqual([{ _tag: "Failure" }])',
            'expect(created).toEqual(expect.objectContaining({ _tag: "Ready" }))',
            // Serialized or declared raw: no constructor builds the wire form.
            'JSON.stringify({ _tag: "NotReady", checks: [] })',
            'const answering = (status: number, body: unknown) => respond(status, JSON.stringify(body)); answering(503, { _tag: "NotReady" })',
            'function answering(status: number, body: unknown = null) { return respond(status, body) }; answering(503, [{ _tag: "NotReady" }])',
        ],
        invalid: [
            // Effect's own variants: their constructors and type.
            {
                code: 'const found = { _tag: "Some", value: rate }',
                errors: [effectVariant("Some")],
            },
            { code: 'const missing = { _tag: "None" }', errors: [effectVariant("None")] },
            {
                code: 'const parsed = { _tag: "Failure", failure: error }',
                errors: [effectVariant("Failure")],
            },
            {
                code: 'const right = { _tag: "Right", right: value }',
                errors: [effectVariant("Right")],
            },
            // Only `_tag` names Effect's variants.
            {
                code: 'const event = { eventType: "Success", id }',
                settings: eventDiscriminants,
                errors: [constructionOf("eventType")],
            },
            // Ported from `anti-slop-no-manual-tagged-construction`, which this rule replaces.
            {
                code: 'const value = { _tag: "Ready", payload };',
                errors: [constructionOf("_tag")],
            },
            {
                code: 'const value = { ["_tag"]: "Ready" };',
                errors: [{ messageId: "manualConstruction" }],
            },
            // The input under test is a value, even inside an assertion.
            {
                code: 'expect(describeOutcome({ _tag: "Ready" })).toBe("ready")',
                errors: [constructionOf("_tag")],
            },
            {
                code: 'const event: PaymentStartedEvent = { eventType: "PaymentStarted", id, payment }',
                settings: eventDiscriminants,
                errors: [constructionOf("eventType")],
            },
            {
                code: 'const toPayment = (amount) => ({ type: "transfer", amount })',
                settings: eventDiscriminants,
                errors: [constructionOf("type")],
            },
            // Only the arguments of the pattern or codec call are exempt.
            {
                code: 'match(payment).with({ type: "card" }, () => ({ type: "settled", amount }))',
                settings: eventDiscriminants,
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
            // Only a parameter declared `unknown` in the file marks the argument as raw.
            {
                code: 'const answering = (status: number, body: Readiness) => respond(status, body); answering(503, { _tag: "NotReady" })',
                errors: [constructionOf("_tag")],
            },
            {
                code: 'import { answering } from "./fake-api"; answering(503, { _tag: "NotReady" })',
                errors: [constructionOf("_tag")],
            },
            {
                code: 'const answering = (body: unknown) => respond(body); { const answering = (body: Readiness) => respond(body); answering({ _tag: "NotReady" }) }',
                errors: [constructionOf("_tag")],
            },
        ],
    },
)
