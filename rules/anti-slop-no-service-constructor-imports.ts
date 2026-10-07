import { defineRule, type ESTree } from "@oxlint/plugins"

import { filePatternsSchema } from "../shared/file-globs.ts"
import { isTestFile } from "../shared/test-files.ts"

const serviceConstructorName = /^make[A-Z]/u

const isProjectLocalImport = (source: string) => source.startsWith("./") || source.startsWith("../")

const importedName = (specifier: ESTree.ImportSpecifier) =>
    specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value

export const antiSlopNoServiceConstructorImportsRule = defineRule({
    meta: {
        type: "problem",
        docs: {
            description: "Disallow project-local make<CapabilityName> imports outside test files.",
        },
        messages: {
            serviceConstructorImport:
                'Do not import Effect service constructor "{{name}}" into runtime code. Import the owning Layer, yield the contextual service, and allow its requirements to propagate to the composition root.',
        },
        schema: [
            {
                type: "object",
                properties: { testFiles: filePatternsSchema },
                additionalProperties: false,
            },
        ],
    },
    createOnce(context) {
        let inTestFile = false

        return {
            // Tests build services from their constructors to inject fakes.
            before() {
                inTestFile = isTestFile(context)
            },
            ImportDeclaration(node) {
                if (inTestFile || !isProjectLocalImport(node.source.value)) return
                for (const specifier of node.specifiers) {
                    if (specifier.type !== "ImportSpecifier") continue
                    const name = importedName(specifier)
                    if (!serviceConstructorName.test(name)) continue
                    context.report({
                        node: specifier,
                        messageId: "serviceConstructorImport",
                        data: { name },
                    })
                }
            },
        }
    },
})
