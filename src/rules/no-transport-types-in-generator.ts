import { defineRule, type ESTree } from "@oxlint/plugins"

import { isInsideEffectGeneratorBody } from "../shared/effect-ast.ts"

const defaultTransportTypes = ["Response", "NextResponse"]

const configuredTransportTypes = (options: ReadonlyArray<unknown>) => {
    const [first] = options
    if (typeof first !== "object" || first === null || !("transportTypes" in first)) {
        return new Set(defaultTransportTypes)
    }
    const types = first.transportTypes
    return new Set(Array.isArray(types) ? types.filter((type) => typeof type === "string") : [])
}

// `new Response(…)`, `Response.json(…)` and a plain factory call `toDto(…)` all build one.
const constructedTypeName = (node: ESTree.NewExpression | ESTree.CallExpression) => {
    const callee = node.callee
    if (callee.type === "Identifier") return callee.name
    if (
        node.type === "CallExpression" &&
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier"
    ) {
        return callee.object.name
    }
    return undefined
}

export const noTransportTypesInGeneratorRule = defineRule({
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Return domain values from Effect generators and convert them to transport types in the second argument of `Effect.fn`.",
        },
        messages: {
            transportInGenerator:
                "Do not build `{{name}}` inside the generator: return a domain value and convert it with `Effect.map`/`Effect.catchTags` in the pipeable arguments of `Effect.fn`.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    transportTypes: { type: "array", items: { type: "string" }, uniqueItems: true },
                },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let transportTypes = new Set<string>()

        const check = (node: ESTree.NewExpression | ESTree.CallExpression) => {
            const name = constructedTypeName(node)
            if (
                name === undefined ||
                !transportTypes.has(name) ||
                !isInsideEffectGeneratorBody(node)
            ) {
                return
            }
            context.report({ node, messageId: "transportInGenerator", data: { name } })
        }

        return {
            // Options are per file, so they can only be read once a file starts.
            before() {
                transportTypes = configuredTransportTypes(context.options)
            },
            NewExpression: check,
            CallExpression: check,
        }
    },
})
