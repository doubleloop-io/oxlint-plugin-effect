import { defineRule, type ESTree } from "@oxlint/plugins"

import { isFunctionNode, type FunctionNode } from "../shared/effect-ast.ts"
import { handlersOf, isMatchCall } from "../shared/match-ast.ts"

const returnedExpressions = (fn: FunctionNode): ReadonlyArray<ESTree.Node> => {
    if (fn.body?.type !== "BlockStatement") return fn.body ? [fn.body] : []
    return fn.body.body.flatMap((statement) =>
        statement.type === "ReturnStatement" && statement.argument ? [statement.argument] : [],
    )
}

const nestedBranches = (handler: ESTree.Node): ReadonlyArray<ESTree.Node> => {
    if (isMatchCall(handler)) return [handler]
    if (!isFunctionNode(handler)) return []
    return returnedExpressions(handler).filter(
        (expression) => isMatchCall(expression) || expression.type === "ConditionalExpression",
    )
}

export const noNestedMatchRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Flatten a match whose handler branches again: guard the exit case first, then the happy path.",
        },
        messages: {
            nestedBranch:
                "This handler branches again inside a match. Return early on the exit case (`if (Result.isFailure(parsed)) return ...`) and keep the remaining branches at the top level.",
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
