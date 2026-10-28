import { RuleTester } from "oxlint/plugins-dev"

import { noInlineSchemaCodecRule } from "./no-inline-schema-codec.ts"

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "no-inline-schema-codec",
    noInlineSchemaCodecRule,
    {
        valid: [
            `const encodeInitializePaymentRequest = Schema.encodeSync(InitializePaymentRequest)
const send = (request) => encodeInitializePaymentRequest(request)`,
            // Module scope runs once.
            "const config = Schema.decodeUnknownSync(Config)(process.env)",
            // Building a codec inside a function without applying it is outside the trigger.
            "const parse = (schema) => { const decode = Schema.decodeUnknownEffect(schema); return decode }",
            // Schema transformations, not codecs.
            "const f = () => Schema.decodeTo(Target)(Source)",
            "const f = () => Schema.encodeKeys({ id: 'ID' })(Struct)",
            // The construction generator of a Layer runs once.
            `const RepoLive = Layer.effect(Repo, Effect.gen(function* () {
    const config = Schema.decodeUnknownSync(RepoConfig)(yield* loadConfig)
    return Repo.of({ config })
}))`,
            `const RepoLive = Layer.effect(Repo)(Effect.gen(function* () {
    const config = yield* Schema.decodeUnknownEffect(RepoConfig)(raw)
    return Repo.of({ config })
}))`,
        ],
        invalid: [
            {
                code: "const response = () => Schema.decodeUnknownSync(SuccessPackageResponse)(pkg)",
                errors: [{ messageId: "inlineCodec", data: { factory: "decodeUnknownSync" } }],
            },
            {
                code: `const handle = Effect.fn("handle")(function* (raw) {
    const payload = yield* Schema.decodeUnknownEffect(Payload)(raw)
    return payload
})`,
                errors: [{ messageId: "inlineCodec", data: { factory: "decodeUnknownEffect" } }],
            },
            {
                code: "function send(body) { return Schema.encodeResult(Body)(body) }",
                errors: [{ messageId: "inlineCodec" }],
            },
            {
                // Tests are not exempt.
                code: `test("decodes the package", () => {
    const response = Schema.decodeUnknownSync(SuccessPackageResponse)(pkg)
})`,
                errors: [{ messageId: "inlineCodec" }],
            },
            {
                // A method of the service built by the Layer runs at every call.
                code: `const RepoLive = Layer.effect(Repo, Effect.gen(function* () {
    return Repo.of({ find: (raw) => Schema.decodeUnknownEffect(Row)(raw) })
}))`,
                errors: [{ messageId: "inlineCodec" }],
            },
            {
                // An ordinary generator is not a Layer's construction.
                code: `const program = Effect.gen(function* () {
    return Schema.decodeUnknownSync(Row)(raw)
})`,
                errors: [{ messageId: "inlineCodec" }],
            },
        ],
    },
)
