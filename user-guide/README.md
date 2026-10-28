---
title: "@doubleloop-io/oxlint-plugin-effect"
---

An oxlint plugin that enforces a catalog of patterns for Effect 4 code.

The rules are written and tested against Effect 4. Where an Effect 3 API has the same intent, the rules recognize its v3 name too: each rule's Trigger names them.

It complements the type-aware rules of [`@effect/tsgo`](alongside-effect-tsgo.md): it does not need them, and it checks what they do not.

## Guide

- [Installation](installation.md): the package and the Node and oxlint versions it requires.
- [Configuration](configuration.md): the `all` preset, picking rules, and the settings that describe your project.
- [Alongside `@effect/tsgo`](alongside-effect-tsgo.md): combining its presets with this one.
- [Default configuration](default-configuration.md): `all` with every setting and option spelled out.
- [Versioning](versioning.md): what a release may change and which oxlint versions are supported.

## Rules

- [Rules overview](rules.md): every rule, grouped by topic.
- [Common limits](../RULES.md#common-limits): the limits every rule shares.
- [Shared settings](../RULES.md#shared-settings): the settings the rules share and the rules that use them.
