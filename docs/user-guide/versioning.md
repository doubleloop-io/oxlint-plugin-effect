---
title: Versioning
order: 7
---

Versions are `0.x`: any minor release may add, remove or change rules, options, settings and messages.

Supported Oxlint is the `peerDependencies` range, `^1.82.0`; CI tests the tarball against `1.82.0`, and a weekly workflow runs the tests and the tarball against the latest Oxlint. Oxlint's JS plugin API is still experimental, so a newer Oxlint minor may break the plugin before the range is narrowed.
