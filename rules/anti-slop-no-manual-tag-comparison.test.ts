import { RuleTester } from "oxlint/plugins-dev"

import { antiSlopNoManualTagComparisonRule } from "./anti-slop-no-manual-tag-comparison.ts"

new RuleTester().run("anti-slop-no-manual-tag-comparison", antiSlopNoManualTagComparisonRule, {
    valid: [
        'Predicate.isTagged("Ready")(value);',
        'Match.value(value).pipe(Match.tag("Ready", handleReady));',
        'if (value.status === "Ready") handleReady(value);',
        'Effect.catch((error) => error._tag === "NotFound" ? recover : fail);',
    ],
    invalid: [
        { code: 'value._tag === "Ready";', errors: [{ messageId: "manualComparison" }] },
        { code: '"Ready" !== value["_tag"];', errors: [{ messageId: "manualComparison" }] },
        {
            code: 'switch (value._tag) { case "Ready": handleReady(value); }',
            errors: [{ messageId: "manualSwitch" }],
        },
    ],
})
