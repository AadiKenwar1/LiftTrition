# Offline Session Removal for Force Sign-Out (issue 16 follow-up)

**Date:** 2026-07-14
**Status:** Approved (Option A chosen in conversation after trade-off review)

## Problem

`supabase.auth.signOut({ scope: 'local' })` makes a network request before
clearing the device session. Offline, the request fails and supabase-js
returns the error **without ever calling its internal `_removeSession()`**
(verified in the installed auth-js: GoTrueClient `_signOut` returns early on
non-401/403/404 errors). No `SIGNED_OUT` event fires.

`clearLocalSession` treated that error as ignorable (warn + continue), so an
offline force sign-out wiped the local PowerSync database while leaving the
user signed in — the worst possible state. In dev builds, auth-js's own
`console.error` of the raw fetch failure surfaces as the
"TypeError: Network request failed" LogBox toast the user reported.

## Design (Option A)

All changes in `context/AuthContext/functions/accountFunctions.tsx`.

### 1. `removeLocalAuthSession()` (new, module-private)

```
try official signOut({ scope: 'local' })
  → resolved without error: done (supabase removed the session + fired SIGNED_OUT)
  → returned { error } or threw: warn, fall through to the fallback
fallback: (supabase.auth as any)._removeSession
  → missing (future supabase upgrade): throw
    Error('Could not sign out on this device. Please try again when back online.')
  → present: await it (this is the exact cleanup supabase runs on successful
    sign-out: removes all storage keys, clears memory, fires SIGNED_OUT —
    so AuthContext and the route guard work unchanged)
```

Failures of `_removeSession` itself propagate.

### 2. Seatbelt ordering in `clearLocalSession()`

```
await removeLocalAuthSession()   // throws → NOTHING below runs
try { await disconnectAndClearPowerSync() } catch { warn }  // unchanged
```

The data wipe can no longer happen unless the device session is gone.
`forceSignOut` keeps its shape; if `clearLocalSession` throws, the profile
screen's existing catch shows the error message and `clearUserStorage` is
skipped too.

Caller impact:
- `forceSignOut` (profile Force button): throw surfaces as the existing
  'Error' alert with the new message; nothing wiped. Correct.
- `deleteAccount`: reaches `clearLocalSession` only after the server
  confirmed deletion (which required network moments earlier), so the
  official signOut path virtually always succeeds or returns an ignorable
  401/404 that supabase handles internally. The throw path is theoretical
  there and acceptable; the tripwire test keeps it from ever shipping.

### 3. Tripwire test (new `lib/supabase/__tests__/authInternals.test.ts`)

Imports the REAL `@supabase/auth-js` (no mocks, no app client — the app
client needs env vars) and asserts
`typeof (GoTrueClient.prototype as any)._removeSession === 'function'`.
A supabase upgrade that renames the private method fails CI immediately.

## Error handling

- User-facing copy when both removal paths fail:
  `Could not sign out on this device. Please try again when back online.`
- Dev-build note: auth-js internally `console.error`s the failed fetch; the
  red LogBox toast may still appear in dev builds when offline. Cosmetic,
  dev-only, not suppressible from app code. Sign-out now completes anyway.

## Testing

Extend `accountFunctions.test.ts` (mock gains `_removeSession`):
1. `signOut` returns `{ error }` → fallback `_removeSession` called → wipe
   proceeds → resolves.
2. `signOut` throws (network TypeError) → same fallback path.
3. `signOut` errors AND `_removeSession` missing → `forceSignOut` rejects
   with 'Could not sign out on this device' AND `disconnectAndClearPowerSync`
   + `clearUserStorage` were NOT called (the seatbelt).
4. Happy path: `signOut` resolves clean → `_removeSession` NOT called,
   wipe proceeds.
5. Existing forceSignOut test ("auth sign-out rejects → cleanup completes")
   updated: still resolves, now via the fallback.

Manual verify (dev build): airplane mode → Sign Out → "You're offline" →
Force sign out → lands on login; relaunch offline → still signed out.
(A dev-only red toast from supabase's internal console.error may still
flash — expected.)

## Out of scope

- Server-side token revocation while offline (impossible; token expires
  naturally).
- The offline *delete account* alert copy (behaves correctly; polish later).
- Any supabase-js version change.
