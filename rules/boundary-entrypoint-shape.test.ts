import { RuleTester } from "oxlint/plugins-dev"

import { boundaryEntrypointShapeRule } from "./boundary-entrypoint-shape.ts"

const filename = "src/main.ts"

new RuleTester().run("boundary-entrypoint-shape", boundaryEntrypointShapeRule, {
    valid: [
        { filename, code: "NodeRuntime.runMain(program satisfies Effect.Effect<void, never>)" },
        {
            filename,
            code: "const runBoundary = (effect: Effect.Effect<Response, never, never>) => Effect.runPromise(effect)",
        },
        { filename, code: "const exit = await Effect.runPromiseExit(program)" },
    ],
    invalid: [
        {
            filename,
            code: "NodeRuntime.runMain(program.pipe(Effect.provide(layer)))",
            errors: [{ messageId: "openErrorChannel" }],
        },
        {
            filename,
            code: "export const POST = (request: Request) => Effect.runPromise(createEvent(request))",
            errors: [{ messageId: "openErrorChannel" }],
        },
        {
            filename,
            code: "Effect.runPromise(program satisfies Effect.Effect<void, AppError>)",
            errors: [{ messageId: "openErrorChannel" }],
        },
        {
            filename,
            code: "const runBoundary = (effect: Effect.Effect<void, AppError>) => Effect.runSync(effect)",
            errors: [{ messageId: "openErrorChannel" }],
        },
    ],
})
