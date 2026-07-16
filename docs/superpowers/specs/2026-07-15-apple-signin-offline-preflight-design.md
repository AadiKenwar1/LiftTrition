# Apple Sign-In Offline Preflight (Layer 1)

**Date:** 2026-07-15
**Status:** Approved (Layer-1-only chosen in conversation; Layer 2 deferred as out of scope)

## Problem

Tapping "Sign in with Apple" while offline runs the native Apple Face ID /
account sheet, exchanges the identity token with Supabase, that request fails,
and only then does `authFunctions.signInWithApple` show a raw
"Sign In Error: Network request failed". Two bad outcomes: the user is set up
to fail *after* completing the Apple interface, and the failure alert is slow
to appear (it waits on the network attempt).

## Decision

Add a fast preflight before the Apple sheet: if the device is *definitely*
offline, show a friendly alert immediately and never call
`AppleAuthentication.signInAsync()`. This is "Layer 1" only. The reactive
error-message improvement ("Layer 2") was explicitly deemed out of scope —
it only changes wording *after* the Apple sheet has already run, so it does
nothing for the two problems above. It can be added later if desired.

## Approaches considered

1. **Preflight with `expo-network`** (chosen): reads OS-cached connection state
   locally (returns in ms), so it can block at the tap. New native dep + one
   EAS rebuild — acceptable, user confirmed rebuilds are fine.
2. **Reactive error mapping only** (`isAuthRetryableFetchError` in the catch):
   no dependency, but can't prevent the wasted Apple sheet or the delay — fails
   the actual goal.
3. **Full connectivity library (NetInfo)**: heavier, redundant with Expo's own
   module in an Expo project.

## Design

### `context/AuthContext/functions/authFunctions.tsx`

Add at the top of `signInWithApple`, before `AppleAuthentication.signInAsync`:

```
let offline = false
try {
    const state = await Network.getNetworkStateAsync()
    offline = state.isConnected === false
} catch {
    // fail-open: a broken network check must never block a sign-in that could work
}
if (offline) {
    Alert.alert('You're offline', 'Sign in with Apple needs an internet connection.')
    return
}
```

Rest of the function is unchanged (Apple sheet → `signInWithIdToken` → existing
catch with cancel handling + generic error alert).

**Rules that matter:**
- Block ONLY on `isConnected === false`. `isConnected` is typed optional
  (`boolean | undefined`); `undefined`/`true` → proceed (never block on an
  "unsure" reading — captive portals etc. fall through to the real flow).
- Fail-open on a thrown `getNetworkStateAsync()` — proceed to normal sign-in.
- No config plugin needed; `expo-network` autolinks. `getNetworkStateAsync`
  needs no runtime permission on iOS.

## Error handling

- Offline: friendly alert, early return, zero native calls.
- Network check itself errors: swallow, proceed (normal flow, existing catch
  still guards the real request).
- Everything past the preflight is unchanged.

## Testing

New `context/AuthContext/functions/__tests__/authFunctions.test.ts`
(authFunctions has no tests today). Mock `expo-network`,
`expo-apple-authentication`, `@/lib/supabase/client`:

1. `isConnected: false` → `Alert.alert` shows the offline copy AND
   `AppleAuthentication.signInAsync` was **never called** (proves the sheet is
   skipped — the core assertion).
2. `isConnected: true` → proceeds to `signInAsync` + `signInWithIdToken`;
   offline alert not shown.
3. `isConnected: undefined` (OS unsure) → proceeds (no block).
4. `getNetworkStateAsync` rejects → proceeds (fail-open).

Manual verify (dev build, requires the EAS rebuild): airplane mode → tap
Sign in with Apple → friendly alert appears immediately, no Face ID prompt;
airplane mode off → normal sign-in, no regression.

## Layer 2 (added 2026-07-15, same session)

Followed up per user request. In `signInWithApple`'s catch, after the
`ERR_REQUEST_CANCELED` check, `isAuthRetryableFetchError(e)` (public export
re-exported from `@supabase/supabase-js`) → the same friendly offline copy;
all other errors keep the generic 'Sign In Error' alert. Covers the
captive-portal case the preflight can't see. Tests: network-error → friendly
copy, non-network error → generic, cancel → silent. No tripwire needed — the
helper is a supported public export, unlike issue-16's `_removeSession`.

## Out of scope

- Layer 3 (inline "no connection" hint on the login screen).
- Android behavior tuning (`isInternetReachable` differences) — iOS-first.
