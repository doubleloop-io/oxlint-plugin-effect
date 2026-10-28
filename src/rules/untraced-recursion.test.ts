import { RuleTester } from "oxlint/plugins-dev"

import { untracedRecursionRule } from "./untraced-recursion.ts"

new RuleTester().run("untraced-recursion", untracedRecursionRule, {
    valid: [
        "const walk = Effect.fnUntraced(function* (node) { for (const child of node.children) yield* walk(child) })",
        'const walk = Effect.fn("walk")(function* (node) { return yield* visit(node) })',
        'const walk = Effect.fn("walk")(function* (node) { const walk = visit; return yield* walk(node) })',
        'const walk = Effect.fn("walk")(function* (node) { return yield* visit(node) }, (effect) => effect.pipe(Effect.orElse(() => walk(fallback))))',
        'const tree = Effect.fn("tree")(function* (root) { return yield* walk(root) }); const walk = Effect.fnUntraced(function* (node) { yield* walk(node.next) })',
    ],
    invalid: [
        {
            code: 'const walk = Effect.fn("walk")(function* (node) { for (const child of node.children) yield* walk(child) })',
            errors: [{ messageId: "recursiveTraced" }],
        },
        {
            code: "const walk = Effect.fn(function* (node) { yield* walk(node.next) })",
            errors: [{ messageId: "recursiveTraced" }],
        },
        {
            code: 'const walk = Effect.fn("walk")(function* (node) { yield* Effect.forEach(node.children, walk) })',
            errors: [{ messageId: "recursiveTraced" }],
        },
        {
            code: 'const walk = Effect.fn("walk")(function* (node) { yield* Effect.forEach(node.children, (child) => walk(child)) })',
            errors: [{ messageId: "recursiveTraced" }],
        },
    ],
})
