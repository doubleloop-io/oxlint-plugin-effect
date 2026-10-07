import { RuleTester } from "oxlint/plugins-dev"

import { antiSlopPreferEffectMatchRule } from "./anti-slop-prefer-effect-match.ts"

new RuleTester().run("anti-slop-prefer-effect-match", antiSlopPreferEffectMatchRule, {
    valid: [
        'kind === "a" ? first : fallback;',
        'kind === "a" ? first : other === "b" ? second : fallback;',
        "condition ? first : otherCondition ? second : fallback;",
    ],
    invalid: [
        {
            code: 'kind === "a" ? first : kind === "b" ? second : fallback;',
            errors: [{ messageId: "preferMatch" }],
        },
        {
            code: "`a` !== kind ? first : `b` === kind ? second : fallback;",
            errors: [{ messageId: "preferMatch" }],
        },
    ],
})
