import { RuleTester } from "oxlint/plugins-dev"

import { antiSlopNoManualTaggedConstructionRule } from "./anti-slop-no-manual-tagged-construction.ts"

new RuleTester().run(
    "anti-slop-no-manual-tagged-construction",
    antiSlopNoManualTaggedConstructionRule,
    {
        valid: [
            'Match.when({ _tag: "Ready" }, handleReady);',
            'Match.not({ "_tag": "Pending" });',
            "Ready.make({ value });",
            "new NotFound({ id });",
            "({ _tag: tag, value });",
        ],
        invalid: [
            {
                code: 'const value = { _tag: "Ready", payload };',
                errors: [{ messageId: "manualConstruction" }],
            },
            {
                code: 'const value = { ["_tag"]: "Ready" };',
                errors: [{ messageId: "manualConstruction" }],
            },
        ],
    },
)
