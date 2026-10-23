import { RuleTester } from "oxlint/plugins-dev"

import { servicePortShapeOnlyRule } from "./service-port-shape-only.ts"

const filename = "src/agent/Agent.ts"

new RuleTester().run("service-port-shape-only", servicePortShapeOnlyRule, {
    valid: [
        {
            filename,
            code: 'export class Agent extends Context.Service<Agent, { readonly search: (name: string) => Effect.Effect<RaceCard> }>()("app/Agent") {}',
        },
        { filename, code: "class Counter extends Base { static layer = 1 }" },
        {
            filename,
            code: 'const Retries = Context.Reference<number>("app/Retries", { defaultValue: () => 3 })',
        },
        // Effect 3 ports.
        {
            filename,
            code: 'export class Agent extends Context.Tag("app/Agent")<Agent, Shape>() {}',
        },
        // The variable form belongs to `service-not-as-class` (effecttsgo).
        { filename, code: 'const Agent = Context.GenericTag<Shape>("app/Agent")' },
    ],
    invalid: [
        {
            filename,
            code: 'class Agent extends Context.Service<Agent, Shape>()("app/Agent", { make: makeAgent }) {}',
            errors: [{ messageId: "makeOption" }],
        },
        {
            filename,
            code: 'class Agent extends Context.Service<Agent, Shape>()("app/Agent") { static readonly layer = Layer.effect(Agent, make) }',
            errors: [{ messageId: "staticImplementation", data: { name: "layer" } }],
        },
        {
            filename,
            code: 'class Agent extends Effect.Service<Agent>()("app/Agent", { effect: make }) {}',
            errors: [{ messageId: "effectService" }],
        },
        {
            filename,
            code: 'class Agent extends Context.Tag("app/Agent")<Agent, Shape>() { static readonly Live = Layer.effect(Agent, make) }',
            errors: [{ messageId: "staticImplementation", data: { name: "Live" } }],
        },
    ],
})
