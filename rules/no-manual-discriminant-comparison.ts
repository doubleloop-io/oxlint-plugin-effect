import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    configuredDiscriminants,
    discriminantOf,
    discriminantsSchema,
    isEqualityComparison,
    isInsideBroadEffectHandler,
    isStringLiteral,
} from "../shared/tagged-values.ts"

export const remedyFor = (discriminant: string) =>
    discriminant === "_tag"
        ? "`Match.tagsExhaustive`, the tagged enum `$match` or an exhaustive ts-pattern match; for a single check, `Predicate.isTagged`"
        : `\`Match.discriminatorsExhaustive("${discriminant}")\` or an exhaustive ts-pattern match`

export const noManualDiscriminantComparisonRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Branch on a union's discriminant with an exhaustive match, not with comparisons or `switch`.",
        },
        messages: {
            manualComparison:
                "Comparing `{{discriminant}}` with a literal still compiles when a variant is added: use {{remedy}}.",
            manualSwitch:
                "A `switch` on `{{discriminant}}` still compiles when a variant is added: use {{remedy}}.",
        },
        schema: [
            {
                type: "object",
                properties: { discriminants: discriminantsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let discriminants = new Set<string>()

        const report = (
            node: ESTree.Node,
            discriminant: string,
            messageId: "manualComparison" | "manualSwitch",
        ) => {
            // Inside `Effect.catch` handlers, `_tag` belongs to `anti-slop-no-manual-effect-error-tag`.
            if (discriminant === "_tag" && isInsideBroadEffectHandler(node)) return
            context.report({
                node,
                messageId,
                data: { discriminant, remedy: remedyFor(discriminant) },
            })
        }

        return {
            before() {
                discriminants = configuredDiscriminants(context.options)
            },
            BinaryExpression(node) {
                if (!isEqualityComparison(node)) return
                const discriminant = isStringLiteral(node.right)
                    ? discriminantOf(node.left, discriminants)
                    : isStringLiteral(node.left)
                      ? discriminantOf(node.right, discriminants)
                      : undefined
                if (discriminant !== undefined) report(node, discriminant, "manualComparison")
            },
            SwitchStatement(node) {
                const discriminant = discriminantOf(node.discriminant, discriminants)
                if (discriminant !== undefined) report(node, discriminant, "manualSwitch")
            },
        }
    },
})
