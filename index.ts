import { eslintCompatPlugin } from "@oxlint/plugins"

import { adapterImportBoundaryRule } from "./rules/adapter-import-boundary.ts"
import { antiSlopNoManualEffectErrorTagRule } from "./rules/anti-slop-no-manual-effect-error-tag.ts"
import { antiSlopNoServiceConstructorImportsRule } from "./rules/anti-slop-no-service-constructor-imports.ts"
import { antiSlopPreferEffectMatchRule } from "./rules/anti-slop-prefer-effect-match.ts"
import { boundaryEntrypointShapeRule } from "./rules/boundary-entrypoint-shape.ts"
import { errorHandlingInEffectFnHandlerRule } from "./rules/error-handling-in-effect-fn-handler.ts"
import { exportedSchemaIdentifierRule } from "./rules/exported-schema-identifier.ts"
import { noAsymmetricMatchHandlersRule } from "./rules/no-asymmetric-match-handlers.ts"
import { noBareErrorInEffectRule } from "./rules/no-bare-error-in-effect.ts"
import { noEffectPromiseRule } from "./rules/no-effect-promise.ts"
import { noEffectReturnTypeRule } from "./rules/no-effect-return-type.ts"
import { noInlineSchemaCodecRule } from "./rules/no-inline-schema-codec.ts"
import { noInlineYieldStarRule } from "./rules/no-inline-yield-star.ts"
import { noManualDiscriminantComparisonRule } from "./rules/no-manual-discriminant-comparison.ts"
import { noManualDiscriminantConstructionRule } from "./rules/no-manual-discriminant-construction.ts"
import { noNestedMatchRule } from "./rules/no-nested-match.ts"
import { noParameterlessCatchAllRule } from "./rules/no-parameterless-catch-all.ts"
import { noProvideOnDefinitionRule } from "./rules/no-provide-on-definition.ts"
import { noTransportTypesInGeneratorRule } from "./rules/no-transport-types-in-generator.ts"
import { preferEffectFnRule } from "./rules/prefer-effect-fn.ts"
import { provideNamedLayerRule } from "./rules/provide-named-layer.ts"
import { redactedSecretNamesRule } from "./rules/redacted-secret-names.ts"
import { runOnlyAtEntryRule } from "./rules/run-only-at-entry.ts"
import { serviceKeyMatchesNameRule } from "./rules/service-key-matches-name.ts"
import { servicePortShapeOnlyRule } from "./rules/service-port-shape-only.ts"
import { singleStylePerFunctionRule } from "./rules/single-style-per-function.ts"
import { tryObjectFormRule } from "./rules/try-object-form.ts"
import { untracedRecursionRule } from "./rules/untraced-recursion.ts"

export const pluginName = "dl-effect"

const dlEffectPlugin = eslintCompatPlugin({
    meta: { name: pluginName },
    rules: {
        "anti-slop-no-manual-effect-error-tag": antiSlopNoManualEffectErrorTagRule,
        "anti-slop-no-service-constructor-imports": antiSlopNoServiceConstructorImportsRule,
        "anti-slop-prefer-effect-match": antiSlopPreferEffectMatchRule,
        "adapter-import-boundary": adapterImportBoundaryRule,
        "boundary-entrypoint-shape": boundaryEntrypointShapeRule,
        "error-handling-in-effect-fn-handler": errorHandlingInEffectFnHandlerRule,
        "exported-schema-identifier": exportedSchemaIdentifierRule,
        "no-asymmetric-match-handlers": noAsymmetricMatchHandlersRule,
        "no-bare-error-in-effect": noBareErrorInEffectRule,
        "no-effect-promise": noEffectPromiseRule,
        "no-effect-return-type": noEffectReturnTypeRule,
        "no-inline-schema-codec": noInlineSchemaCodecRule,
        "no-inline-yield-star": noInlineYieldStarRule,
        "no-manual-discriminant-comparison": noManualDiscriminantComparisonRule,
        "no-manual-discriminant-construction": noManualDiscriminantConstructionRule,
        "no-nested-match": noNestedMatchRule,
        "no-parameterless-catch-all": noParameterlessCatchAllRule,
        "no-provide-on-definition": noProvideOnDefinitionRule,
        "no-transport-types-in-generator": noTransportTypesInGeneratorRule,
        "prefer-effect-fn": preferEffectFnRule,
        "provide-named-layer": provideNamedLayerRule,
        "redacted-secret-names": redactedSecretNamesRule,
        "run-only-at-entry": runOnlyAtEntryRule,
        "service-key-matches-name": serviceKeyMatchesNameRule,
        "service-port-shape-only": servicePortShapeOnlyRule,
        "single-style-per-function": singleStylePerFunctionRule,
        "try-object-form": tryObjectFormRule,
        "untraced-recursion": untracedRecursionRule,
    },
})

export default dlEffectPlugin
