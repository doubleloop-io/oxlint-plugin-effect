---
title: Versioning
order: 7
---

Versions are `0.x`: any minor release may add, remove or change rules, options, settings and messages.

Supported oxlint is the `peerDependencies` range, `^1.82.0`; CI tests the tarball against `1.82.0`. oxlint's JS plugin API is still experimental, so a newer oxlint minor may break the plugin before the range is narrowed.
