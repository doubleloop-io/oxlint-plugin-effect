import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, memberOf } from "../shared/effect-ast.ts"

// A naming heuristic: `_JSON` is here because a service account key travels as inline JSON.
const secretName = /(KEY|SECRET|TOKEN|PASSWORD|CREDENTIALS?|_JSON)$/

const isRedactedSchema = (node: ESTree.Node | undefined) =>
    node?.type === "CallExpression" &&
    (memberOf(node.callee, "Schema")?.startsWith("Redacted") ?? false)

const isRedactedConfig = (node: ESTree.CallExpression) => {
    const name = calleeOf(node, "Config")
    return (
        name === "redacted" ||
        (name === "schema" && isRedactedSchema(node.arguments[0])) ||
        calleeOf(node.parent, "Config") === "redacted"
    )
}

export const redactedSecretNamesRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description: "Read configuration values whose name looks like a secret as `Redacted`.",
        },
        messages: {
            notRedacted:
                "`{{name}}` looks like a secret: read it with `Config.redacted` or `Config.schema(Schema.Redacted(...), name)`.",
        },
    },
    createOnce(context) {
        return {
            CallExpression(node) {
                if (calleeOf(node, "Config") === undefined || isRedactedConfig(node)) return
                for (const argument of node.arguments) {
                    if (
                        argument.type === "Literal" &&
                        typeof argument.value === "string" &&
                        secretName.test(argument.value)
                    ) {
                        context.report({
                            node: argument,
                            messageId: "notRedacted",
                            data: { name: argument.value },
                        })
                    }
                }
            },
        }
    },
})
