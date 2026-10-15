import { defineRule, type ESTree } from "@oxlint/plugins"

import { calleeOf, memberOf } from "../shared/effect-ast.ts"
import { propertyName } from "../shared/tagged-values.ts"

// A naming heuristic: `_JSON` is here because a service account key travels as inline JSON.
const secretName = /(KEY|SECRET|TOKEN|PASSWORD|CREDENTIALS?|_JSON)$/

// No generic `token`: `nextPageToken` and `tokenType` are not secrets.
const defaultSecretFields = [
    "password",
    "secret",
    "apiKey",
    "accessToken",
    "refreshToken",
    "idToken",
]

const nullableWrappers = new Set(["optional", "optionalKey", "NullOr", "UndefinedOr", "NullishOr"])
const chainMethods = new Set(["pipe", "check", "annotate"])

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

const isRedactedReference = (node: ESTree.Node) =>
    (memberOf(node, "Schema") ?? calleeOf(node, "Schema"))?.startsWith("Redacted") ?? false

// `Schema.String`, `Schema.NonEmptyString.check(…)`, `Schema.optional(Schema.String)`: a schema
// that is visibly plain text. A named schema (`AccessToken`) may already be `Redacted`.
const isPlainSchema = (node: ESTree.Node | undefined): boolean => {
    if (node?.type === "MemberExpression") {
        const name = memberOf(node, "Schema")
        return name !== undefined && !name.startsWith("Redacted")
    }
    if (node?.type !== "CallExpression") return false
    const wrapper = calleeOf(node, "Schema")
    if (wrapper !== undefined)
        return nullableWrappers.has(wrapper) && isPlainSchema(node.arguments[0])
    const { callee } = node
    if (
        callee.type !== "MemberExpression" ||
        callee.computed ||
        callee.property.type !== "Identifier" ||
        !chainMethods.has(callee.property.name)
    ) {
        return false
    }
    return !node.arguments.some(isRedactedReference) && isPlainSchema(callee.object)
}

// `Schema.Struct({…})` and `Schema.Class<X>("X")({…})`.
const fieldsOf = (node: ESTree.CallExpression) => {
    const isStruct = calleeOf(node, "Schema") === "Struct"
    const isClass = calleeOf(node.callee, "Schema") === "Class"
    const fields = isStruct || isClass ? node.arguments[0] : undefined
    return fields?.type === "ObjectExpression" ? fields : undefined
}

// `password` matches `password` and `dbPassword`, not `passwordPolicy`.
const matchesSecretField = (name: string, secretFields: ReadonlyArray<string>) =>
    secretFields.some(
        (field) =>
            name === field || name.endsWith(`${field.charAt(0).toUpperCase()}${field.slice(1)}`),
    )

const configuredSecretFields = (options: ReadonlyArray<unknown>) => {
    const [first] = options
    if (typeof first !== "object" || first === null || !("secretFields" in first)) {
        return defaultSecretFields
    }
    const names = first.secretFields
    return Array.isArray(names) ? names.filter((name) => typeof name === "string") : []
}

export const redactedSecretNamesRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Read configuration values and declare Schema fields whose name looks like a secret as `Redacted`.",
        },
        messages: {
            notRedacted:
                "`{{name}}` looks like a secret: read it with `Config.redacted` or `Config.schema(Schema.Redacted(...), name)`.",
            fieldNotRedacted:
                "`{{name}}` looks like a secret: declare it as `Schema.Redacted(...)` so it stays out of logs.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    secretFields: { type: "array", items: { type: "string" }, uniqueItems: true },
                },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let secretFields: ReadonlyArray<string> = defaultSecretFields

        const checkConfig = (node: ESTree.CallExpression) => {
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
        }

        const checkSchemaFields = (node: ESTree.CallExpression) => {
            for (const property of fieldsOf(node)?.properties ?? []) {
                if (property.type !== "Property") continue
                const name = propertyName(property)
                if (name === undefined || !matchesSecretField(name, secretFields)) continue
                if (!isPlainSchema(property.value)) continue
                context.report({
                    node: property.key,
                    messageId: "fieldNotRedacted",
                    data: { name },
                })
            }
        }

        return {
            before() {
                secretFields = configuredSecretFields(context.options)
            },
            CallExpression(node) {
                checkConfig(node)
                checkSchemaFields(node)
            },
        }
    },
})
