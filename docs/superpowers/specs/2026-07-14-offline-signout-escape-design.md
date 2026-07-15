# Offline Sign-Out Escape Hatch (AUDIT_MAJOR issue 16)

**Date:** 2026-07-14
**Status:** Approved (design presented in conversation; user approved before spec was written)

## Problem

Sign-out is gated on draining the upload queue (Gate C). Offline,
`flushUploadsOrThrow` throws `UploadFlushNotConnectedError`, but
`profile.tsx` only recognizes `UploadFlushTimeoutError` as "offer force
sign-out" — so offline users get a dead-end alert ("PowerSync is not
connected." / OK) and cannot sign out at all until they find internet.

The rescue path itself already works offline: `forceSignOut()` →
`clearLocalSession()` uses `supabase.auth.signOut({ scope: 'local' })`
with every teardown step guarded (built as F4 during issues 1/19).
The bug is purely that the escape hatch is keyed to one error subclass.

## Approaches considered

1. **Add a second `if` for `UploadFlushNotConnectedError`** — rejected:
   the next flush-failure type re-opens the bug; two near-identical
   branches drift.
2. **Common `UploadFlushError` base + `isUploadFlushError()`** (chosen,
   per audit plan): any flush-failure type inherits the escape hatch
   automatically; the screen branches once on the category and only
   varies the copy.
3. **Have `signOut()` itself fall back to force sign-out** — rejected:
   data loss must stay behind an explicit user confirmation in the UI,
   never implicit in a library function.

## Design

### 1. `lib/powersync/FlushUploads.ts`

- New base class `UploadFlushError extends Error`; the two existing
  classes extend it:
  - `UploadFlushTimeoutError extends UploadFlushError`
  - `UploadFlushNotConnectedError extends UploadFlushError`
- New predicate, exported from the same module the errors live in:
  `isUploadFlushError(e: unknown): e is UploadFlushError` —
  `e instanceof UploadFlushError`.
- `flushUploadsOrThrow` behavior unchanged.

### 2. `context/AuthContext/functions/accountFunctions.tsx`

- Delete `isUploadFlushTimeoutError` (profile.tsx is its only consumer;
  the predicate now lives beside the error classes in FlushUploads.ts).
  Drop the now-unused `UploadFlushTimeoutError` import. No other change —
  `signOut`, `forceSignOut`, `clearLocalSession` stay as they are.

### 3. `app/settingsScreens/profile.tsx` (handleSignOut)

- Import `isUploadFlushError` + `UploadFlushNotConnectedError` from
  `@/lib/powersync/FlushUploads`; keep importing `forceSignOut` from
  accountFunctions.
- Replace the `isUploadFlushTimeoutError(error)` branch with
  `isUploadFlushError(error)`. Inside, adapt the copy to the case:
  - offline (`error instanceof UploadFlushNotConnectedError`):
    title `You're offline`, message
    `Sign out anyway? Unsynced data will be lost.`
  - otherwise (timeout): existing copy — title `Still syncing`, message
    `We're still uploading your data. You can wait and try again, or
    force sign out (unsynced data may be lost).`
- Buttons and the force-sign-out handler are unchanged (Cancel /
  Force sign out → `forceSignOut()` with its own error alert and
  loading state).
- The generic `else` error alert stays for non-flush errors.

## Error handling

- `forceSignOut()` failures keep the existing 'Error' alert inside the
  force handler.
- Non-flush sign-out errors (e.g. Supabase revoke failure) keep the
  generic error alert — unchanged behavior.

## Testing

- New `lib/powersync/__tests__/flushUploads.test.ts` (TDD):
  - `isUploadFlushError` truth table: true for `UploadFlushTimeoutError`
    and `UploadFlushNotConnectedError` instances, false for plain
    `Error` / non-errors.
  - `flushUploadsOrThrow` lock-ins (mock `@/lib/powersync/system` +
    `@/lib/powersync/uploadQueueStats`): not connected → throws
    `UploadFlushNotConnectedError` (and it satisfies
    `isUploadFlushError`); connected but queue never drains (short
    `timeoutMs`) → throws `UploadFlushTimeoutError` (also satisfies the
    predicate); queue drains → resolves.
- `accountFunctions.test.ts`: remove the now-unneeded
  `UploadFlushTimeoutError` member from its FlushUploads mock.
- Screen behavior is verified manually (repo convention — screens are
  not unit-tested except route guards): airplane mode → Sign Out →
  "You're offline" alert → Force sign out → login screen; relaunch
  offline stays signed out; slow-sync timeout still shows
  "Still syncing" copy.

## Out of scope

- Any change to Gate C semantics, timeouts, or `clearLocalSession`.
- Other callers of sign-out (there are none besides profile.tsx).
