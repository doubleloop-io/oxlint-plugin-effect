import { defineRule } from "@oxlint/plugins"

import { handlersOf, isMatchCall, nestedBranches } from "../shared/match-ast.ts"

export const noNestedMatchRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Flatten a match whose handler branches again: a guard clause inside generators, a named handler outside.",
        },
        messages: {
            nestedBranch:
                "This handler branches again inside a match. Inside a generator, return early on the exit case (`if (Result.isFailure(parsed)) return yield* ...`); outside, name the inner choice and pass it as the handler.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                if (!isMatchCall(node)) return
                for (const branch of handlersOf(node).flatMap(nestedBranches)) {
                    context.report({ node: branch, messageId: "nestedBranch" })
                }
            },
        }
    },
})
