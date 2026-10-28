---
title: try-object-form
group: Error channel
---

**Intent**: `Effect.try` and `Effect.tryPromise` take `{ try, catch }`, with `catch` producing a tagged error.

```ts
// no
Effect.tryPromise(() => api.spreadsheets.get({ spreadsheetId }))

// yes
Effect.tryPromise({
    try: () => api.spreadsheets.get({ spreadsheetId }),
    catch: toSheetError(spreadsheetId),
})
```

**Trigger**: `Effect.try` and `Effect.tryPromise` whose argument is not an object literal.

**Exemptions and blind spots**: an options object held in a variable is reported too.

**Why**: the thunk form types the error as `Cause.UnknownError` (`UnknownException` in v3), which no caller can handle by tag.

**Options**: none

**Fix**: none
