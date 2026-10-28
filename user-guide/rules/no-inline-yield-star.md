---
title: no-inline-yield-star
group: Code shape
---

**Intent**: a `yield*` result is bound to a `const` before being used.

```ts
// no
function* () {
    return yield* missingIn(yield* readSheet())
}

// yes
function* () {
    const sheet = yield* readSheet()
    return yield* missingIn(sheet)
}
```

**Trigger**: a `yield*` whose result is used inside a larger expression: argument, operand, member, property, template.

**Exemptions and blind spots**: a `yield*` that is the whole value of a statement (`yield* x`, `return yield* x`, `if (yield* x)`, `for (… of yield* x)`), a declaration or an assignment. Also the whole branch of a ternary, or the right operand of `&&`/`||`/`??`, in one of those positions (`const a = cached ?? (yield* x)`): binding first would run the effect unconditionally. The autofix extracts every nested `yield*` into `const`s, innermost first, named after the argument's last identifier without a verb prefix (`readSheet()` → `sheet`). There is no autofix when moving the effect could change when or how often it runs: branches of a ternary or `&&`/`||`/`??` inside a larger expression, optional chaining, `while`/`for` conditions, statements without braces, another call evaluated before the `yield*`.

**Why**: with several `yield*`s in one expression the order of effects can only be inferred from precedence. One `const` per effect makes the order the reading order and names the intermediate value.

**Options**: none

**Fix**: autofix
