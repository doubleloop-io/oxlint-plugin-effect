import { defineRule, type ESTree } from "@oxlint/plugins"

import {
    configuredDiscriminants,
    discriminantOf,
    isEqualityComparison,
    isInsideBroadEffectHandler,
    isStringLiteral,
} from "../shared/tagged-values.ts"

export const remedyFor = (discriminant: string) =>
    discriminant === "_tag"
        ? "`Match.tagsExhaustive`, the tagged enum `$match` or an exhaustive ts-pattern match; for a single check, `Predicate.isTagged`"
        : `\`Match.discriminatorsExhaustive("${discriminant}")\` or an exhaustive ts-pattern match`

// Effect's own two-variant types cannot gain a variant: their refinements are the remedy.
const effectVariants: Readonly<Record<string, { readonly owner: string; readonly guard: string }>> =
    {
        Success: { owner: "`Result`/`Exit`", guard: "`Result.isSuccess` or `Exit.isSuccess`" },
        Failure: { owner: "`Result`/`Exit`", guard: "`Result.isFailure` or `Exit.isFailure`" },
        Left: { owner: "`Either`", guard: "`Either.isLeft`" },
        Right: { owner: "`Either`", guard: "`Either.isRight`" },
        Some: { owner: "`Option`", guard: "`Option.isSome`" },
        None: { owner: "`Option`", guard: "`Option.isNone`" },
    }

const effectVariantOf = (tag: string) =>
    Object.hasOwn(effectVariants, tag) ? { tag, ...effectVariants[tag] } : undefined

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
            effectVariantComparison:
                'For the `"{{tag}}"` variant of {{owner}}, use {{guard}}; for a union of your own, {{remedy}}.',
            manualSwitch:
                "A `switch` on `{{discriminant}}` still compiles when a variant is added: use {{remedy}}.",
        },
        schema: [],
    },
    createOnce(context) {
        let discriminants = new Set<string>()

        const report = (
            node: ESTree.Node,
            discriminant: string,
            messageId: "manualComparison" | "manualSwitch",
            literal?: string,
        ) => {
            // Inside `Effect.catch` handlers, `_tag` belongs to `anti-slop-no-manual-effect-error-tag`.
            if (discriminant === "_tag" && isInsideBroadEffectHandler(node)) return
            const remedy = remedyFor(discriminant)
            const variant =
                discriminant === "_tag" && literal !== undefined
                    ? effectVariantOf(literal)
                    : undefined
            if (variant !== undefined) {
                context.report({
                    node,
                    messageId: "effectVariantComparison",
                    data: { ...variant, remedy },
                })
                return
            }
            context.report({ node, messageId, data: { discriminant, remedy } })
        }

        return {
            before() {
                discriminants = configuredDiscriminants(context.settings)
            },
            BinaryExpression(node) {
                if (!isEqualityComparison(node)) return
                const literal = isStringLiteral(node.right)
                    ? node.right
                    : isStringLiteral(node.left)
                      ? node.left
                      : undefined
                if (literal === undefined) return
                const subject = literal === node.right ? node.left : node.right
                const discriminant = discriminantOf(subject, discriminants)
                if (discriminant !== undefined)
                    report(node, discriminant, "manualComparison", literal.value)
            },
            SwitchStatement(node) {
                const discriminant = discriminantOf(node.discriminant, discriminants)
                if (discriminant !== undefined) report(node, discriminant, "manualSwitch")
            },
        }
    },
})
