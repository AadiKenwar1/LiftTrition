# Delete-Account Teardown Fix (Audit Issue 1) — Design

**Date:** 2026-07-13
**Status:** Approved in conversation 2026-07-13
**Source:** `docs/AUDIT_MAJOR.txt` issue 1 PLAN (Option A)

## Problem

`deleteAccount()` erases the server account via the Edge Function, then calls
`signOut()`, whose first step is `flushUploadsOrThrow` (Gate C, 60s). Pending
inserts can never upload for a deleted account, PowerSync retries forever, the
flush times out and throws, and the local cleanup after it
(`disconnectAndClearPowerSync`, `AsyncStorage.clear`) never runs. The user
stays "signed in" to a dead account. `forceSignOut()` has a sibling flaw: it
throws on `supabase.auth.signOut()` error before reaching local cleanup.

## Decision

**Option A — no flush on the delete path.** The delete confirmation dialog
("All your data will be permanently deleted") already covers unsynced changes;
uploading them seconds before the server erases them protects nothing.

Alternatives considered: (B) the audit's original flush-first + "Delete
anyway" prompt — redundant second consent, adds up to 60s of wait to upload
data into an incinerator; (C) swap `signOut()` → `forceSignOut()` — inherits
forceSignOut's own stranding flaw. A chosen; audit PLAN updated to match.

## Design

Production file: `context/AuthContext/functions/accountFunctions.tsx` (only
one).

### New export `clearLocalSession()` — the F4 primitive

1. `supabase.auth.signOut({ scope: 'local' })`, guarded (returned error
   logged; thrown error caught). On success — or on the tolerated
   401/403/404 a dead account produces — supabase-js removes the stored
   session and fires `SIGNED_OUT`, which AuthContext turns into
   session=null → route guard → login screen. `'local'` revokes only this
   device's session; a deleted account has no other sessions to revoke.
   Note: both scopes still make one best-effort network call; robustness
   comes from the guard, not the scope.
2. `disconnectAndClearPowerSync()`, guarded. Wipes the local SQLite replica
   including the pending upload queue — the actual "discard unsynced
   changes" step. Server data untouched (already gone on the delete path).

Each step `try/catch → console.warn`; no step can prevent a later one.
AsyncStorage is NOT cleared here (F4 rule — issue 19 will own per-user
storage cleanup).

### `deleteAccount()`

Unchanged through the Edge Function call: no session → throw; `!res.ok` →
throw; nothing local touched (an offline delete is a clean abort — the
account cannot be deleted without reaching the server, by design). On
success: `await clearLocalSession()`, then guarded `AsyncStorage.clear()`.
Never throws once the server has confirmed deletion. No flush anywhere.

### `forceSignOut()`

Becomes `clearLocalSession()` + guarded `AsyncStorage.clear()`. No longer
throws before local cleanup; the auth revoke is best-effort (offline cost:
one orphaned refresh token that expires unused — acceptable for the
last-resort button).

### Untouched

- `signOut()` keeps Gate C exactly as-is (unsynced data still matters when
  the account lives on).
- `profile.tsx` unchanged; its generic delete-error alert is now only
  reachable when the Edge Function failed, i.e. with the account intact.

## Testing

New `context/AuthContext/functions/__tests__/accountFunctions.test.ts`,
style mirroring `lib/powersync/__tests__/connector.test.ts`. Mocks:
`@/lib/supabase/client`, `@/lib/powersync/orchestrator`,
`@/lib/powersync/FlushUploads`, `@react-native-async-storage/async-storage`,
`global.fetch`, `EXPO_PUBLIC_SUPABASE_URL`.

| #  | Case                                                            | Red pre-fix |
| -- | --------------------------------------------------------------- | ----------- |
| T1 | No session → rejects, fetch never called                        | no          |
| T2 | Edge Fn `!res.ok` → rejects, zero teardown calls                | no          |
| T3 | Success → `flushUploadsOrThrow` never called                    | **yes**     |
| T4 | Success → PowerSync clear + storage clear called, resolves      | no          |
| T5 | `auth.signOut` rejects → teardown still completes, resolves     | **yes**     |
| T6 | Ordering: Edge Fn fetch before any teardown call                | no          |
| T7 | `forceSignOut`: `auth.signOut` rejects → cleanup runs, resolves | **yes**     |

Manual device verification (owner, post-merge):

1. Airplane mode, log a meal → Delete Account → clean abort, error alert,
   relaunch still signed in, meal intact.
2. Log 2-3 entries in airplane mode → network on → Delete Account
   immediately → completes with no 60s hang, lands on login, relaunch stays
   signed out.
3. Fully synced → Delete Account → instant; Supabase dashboard shows auth
   user and rows gone.

## Out of scope

Issue 2 (Edge Function atomicity / ON DELETE CASCADE), issue 16 (profile.tsx
escape-hatch error category), issue 19 (`AsyncStorage.clear()` stays for
now). Audit doc entry deletion deferred until manual device verification
passes.
