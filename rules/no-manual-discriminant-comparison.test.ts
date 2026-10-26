import { RuleTester } from "oxlint/plugins-dev"

import {
    noManualDiscriminantComparisonRule,
    remedyFor,
} from "./no-manual-discriminant-comparison.ts"

const eventDiscriminants = { "dl-effect": { discriminants: ["_tag", "type", "eventType"] } }

const comparisonOn = (discriminant: string) => ({
    messageId: "manualComparison" as const,
    data: { discriminant, remedy: remedyFor(discriminant) },
})

const paymentSwitch = `switch (payment.type) {
    case "card":
        return fromCard(payment)
    case "transfer":
        return fromTransfer(payment)
}`

new RuleTester().run("no-manual-discriminant-comparison", noManualDiscriminantComparisonRule, {
    valid: [
        // Ported from `anti-slop-no-manual-tag-comparison`, which this rule replaces.
        'Predicate.isTagged("Ready")(value);',
        'Match.value(value).pipe(Match.tag("Ready", handleReady));',
        'if (value.status === "Ready") handleReady(value);',
        'Effect.catch((error) => error._tag === "NotFound" ? recover : fail);',
        // Only `_tag` by default.
        paymentSwitch,
        'const isPaid = event.type === "paid"',
        {
            code: 'if (value.status === "Ready") handleReady(value);',
            settings: eventDiscriminants,
        },
        { code: "event.type === expected", settings: eventDiscriminants },
        { code: 'value._tag === "Ready"', settings: { "dl-effect": { discriminants: ["type"] } } },
    ],
    invalid: [
        // Ported from `anti-slop-no-manual-tag-comparison`, which this rule replaces.
        {
            code: 'value._tag === "Ready";',
            errors: [comparisonOn("_tag")],
        },
        { code: '"Ready" !== value["_tag"];', errors: [{ messageId: "manualComparison" }] },
        {
            code: 'switch (value._tag) { case "Ready": handleReady(value); }',
            errors: [{ messageId: "manualSwitch" }],
        },
        {
            code: paymentSwitch,
            settings: eventDiscriminants,
            errors: [
                {
                    messageId: "manualSwitch",
                    data: { discriminant: "type", remedy: remedyFor("type") },
                },
            ],
        },
        {
            code: 'const price = payment.type === "card" ? fromCard(payment) : fromTransfer(payment)',
            settings: eventDiscriminants,
            errors: [comparisonOn("type")],
        },
        {
            code: 'if (event["eventType"] === "OrderConfirmed") return confirm(event)',
            settings: eventDiscriminants,
            errors: [comparisonOn("eventType")],
        },
        {
            code: 'Effect.catch((error) => error.type === "timeout" ? retry : Effect.fail(error))',
            settings: eventDiscriminants,
            errors: [comparisonOn("type")],
        },
        {
            code: 'if (started._tag === "Failure") return unavailable(started.failure)',
            errors: [
                {
                    messageId: "effectVariantComparison",
                    data: {
                        tag: "Failure",
                        owner: "`Result`/`Exit`",
                        guard: "`Result.isFailure` or `Exit.isFailure`",
                        remedy: remedyFor("_tag"),
                    },
                },
            ],
        },
        {
            code: '"None" === found._tag',
            errors: [{ messageId: "effectVariantComparison" }],
        },
        {
            code: 'switch (answer._tag) { case "Success": return show(answer.success) }',
            errors: [{ messageId: "manualSwitch" }],
        },
        {
            code: 'const confirmed = event.type === "Success"',
            settings: eventDiscriminants,
            errors: [comparisonOn("type")],
        },
    ],
})
