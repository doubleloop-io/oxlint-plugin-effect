---
"@doubleloop-io/oxlint-plugin-effect": patch
---

Prevent `no-inline-yield-star` autofixes from generating duplicate `const` bindings when multiple statements in the same generator extract the same base name.
