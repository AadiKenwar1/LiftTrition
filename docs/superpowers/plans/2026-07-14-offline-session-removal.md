# Offline Session Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offline force sign-out actually signs the user out — when supabase's sign-out can't reach the server, remove the device session via supabase's own internal cleanup, and never wipe local data unless the session is confirmed gone.

**Architecture:** New module-private `removeLocalAuthSession()` in accountFunctions: official `signOut({ scope: 'local' })` first; on error/throw, fall back to the private `supabase.auth._removeSession()` (the exact cleanup supabase runs on successful sign-out — clears storage + memory + fires SIGNED_OUT so AuthContext navigation works unchanged); if that's unavailable, throw. `clearLocalSession` runs it BEFORE the PowerSync wipe so a failed removal aborts everything. A tripwire test against the real auth-js package fails CI if a supabase upgrade renames the private method.

**Tech Stack:** React Native / Expo 54, @supabase/supabase-js v2 (auth-js), Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-07-14-offline-session-removal-design.md`

## Global Constraints

- User-facing failure copy is exactly: `Could not sign out on this device. Please try again when back online.`
- **Do NOT run any git commands** (no add/commit/branch) — the user owns all version control.
- Comments only where non-obvious (the private-API fallback IS non-obvious — comment it and point at the tripwire test).
- Test commands use `npm run test:ci -- <pattern>` (`npm test` is watch mode — never use it here).
- Pre-existing failing suites (connector, workout validator, nutrition graphFunctions, logFunctions, openAI, foodDB) and pre-existing `tsc` errors are out of scope; only files touched here must be clean.

---

### Task 1: Fallback + seatbelt in clearLocalSession (TDD)

**Files:**
- Modify: `context/AuthContext/functions/__tests__/accountFunctions.test.ts` (mock at lines 7–14, new describe block)
- Modify: `context/AuthContext/functions/accountFunctions.tsx:52-69` (`clearLocalSession` + new helper above it)

**Interfaces:**
- Produces: `removeLocalAuthSession(): Promise<void>` (module-private, not exported); `clearLocalSession()` now THROWS when the device session cannot be removed, and only reaches `disconnectAndClearPowerSync()` after session removal succeeded. `forceSignOut`/`deleteAccount` signatures unchanged.
- Consumes: existing `supabase.auth.signOut`, private `supabase.auth._removeSession` (runtime-checked).

- [ ] **Step 1: Extend the test mock and add failing tests**

Replace the supabase mock (lines 7–14) with:

```ts
jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
            signOut: jest.fn(),
        },
    },
}))
```
(unchanged — the private method is attached per-test below so its absence can also be tested)

Add after the imports (line 5 area), importing `clearLocalSession` too:

```ts
import { clearLocalSession, deleteAccount, forceSignOut, signOut } from '../accountFunctions'

const authMock = supabase.auth as unknown as { getSession: jest.Mock; signOut: jest.Mock; _removeSession?: jest.Mock }
const mockRemoveSession = jest.fn()
```

In the existing `beforeEach`, after the `supabase.auth.signOut` line, add:

```ts
    authMock._removeSession = mockRemoveSession
    mockRemoveSession.mockResolvedValue(undefined)
```

Add a new describe block after the `forceSignOut` describe:

```ts
describe('clearLocalSession', () => {
    it('does not touch _removeSession when the official signOut succeeds', async () => {
        await clearLocalSession()

        expect(mockRemoveSession).not.toHaveBeenCalled()
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
    })

    it('falls back to _removeSession when signOut returns an error, then wipes', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('Network request failed') })

        await expect(clearLocalSession()).resolves.toBeUndefined()

        expect(mockRemoveSession).toHaveBeenCalledTimes(1)
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
    })

    it('falls back to _removeSession when signOut throws', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new TypeError('Network request failed'))

        await expect(clearLocalSession()).resolves.toBeUndefined()

        expect(mockRemoveSession).toHaveBeenCalledTimes(1)
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
    })

    it('aborts before wiping anything when the session cannot be removed', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('Network request failed') })
        delete authMock._removeSession

        await expect(clearLocalSession()).rejects.toThrow('Could not sign out on this device')

        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
    })
})
```

And inside the existing `forceSignOut` describe, add the seatbelt test:

```ts
    it('skips every teardown step when the session cannot be removed', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new TypeError('Network request failed'))
        delete authMock._removeSession

        await expect(forceSignOut()).rejects.toThrow('Could not sign out on this device')

        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
        expect(clearUserStorage).not.toHaveBeenCalled()
    })
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npm run test:ci -- accountFunctions`
Expected: FAIL — fallback tests fail because `_removeSession` is never called; abort tests fail because `clearLocalSession` currently resolves (warn + wipe) instead of rejecting.

- [ ] **Step 3: Implement**

In `context/AuthContext/functions/accountFunctions.tsx`, replace `clearLocalSession` (lines 52–69) with:

```tsx
/**
 * Remove the auth session from this device without requiring the network.
 * signOut({ scope: 'local' }) calls the server BEFORE deleting the stored
 * session, so offline it returns an error with the session still on disk.
 * The fallback calls supabase's private _removeSession — the exact cleanup a
 * successful sign-out runs (storage keys, memory, SIGNED_OUT event). Its
 * existence is pinned by lib/supabase/__tests__/authInternals.test.ts.
 */
async function removeLocalAuthSession(): Promise<void> {
    try {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (!error) return
        console.warn('clearLocalSession: auth signOut failed; removing local session directly', error)
    } catch (e) {
        console.warn('clearLocalSession: auth signOut threw; removing local session directly', e)
    }

    const auth = supabase.auth as unknown as { _removeSession?: () => Promise<void> }
    if (typeof auth._removeSession !== 'function') {
        throw new Error('Could not sign out on this device. Please try again when back online.')
    }
    await auth._removeSession()
}

/**
 * End the session on this device and wipe the local PowerSync replica.
 * Session removal must succeed BEFORE anything is wiped — otherwise a failed
 * sign-out would leave the user signed in with an empty local database.
 */
export async function clearLocalSession(): Promise<void> {
    await removeLocalAuthSession()

    try {
        await disconnectAndClearPowerSync()
    } catch (e) {
        console.warn('clearLocalSession: PowerSync clear failed', e)
    }
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npm run test:ci -- accountFunctions`
Expected: PASS (16 tests: 11 existing + 5 new, with the existing forceSignOut rejection test now passing via the fallback).

---

### Task 2: Tripwire test against the real auth-js

**Files:**
- Create: `lib/supabase/__tests__/authInternals.test.ts`

**Interfaces:**
- Consumes: the REAL `@supabase/auth-js` package (no mocks; do NOT import `@/lib/supabase/client` — it constructs a client and needs env vars).
- Produces: CI failure the moment a supabase upgrade removes/renames `_removeSession`.

- [ ] **Step 1: Write the test**

```ts
import { GoTrueClient } from '@supabase/auth-js'

// accountFunctions.removeLocalAuthSession falls back to the private
// _removeSession when offline. A supabase upgrade that renames it must fail
// here, at test time — not silently break offline force sign-out.
describe('supabase auth internals contract', () => {
    it('GoTrueClient still exposes _removeSession', () => {
        const proto = GoTrueClient.prototype as unknown as Record<string, unknown>
        expect(typeof proto._removeSession).toBe('function')
    })
})
```

- [ ] **Step 2: Run it**

Run: `npm run test:ci -- authInternals`
Expected: PASS immediately (this is a contract pin, not a red-green cycle — it can only fail after a dependency upgrade).

---

### Task 3: Full verification + docs

**Files:**
- Modify: `docs/COMPLETED_ISSUES.txt` (append a follow-up line to issue 16's "Completed 2026-07-14" postscript)

- [ ] **Step 1: Run the affected suites**

Run: `npm run test:ci -- "accountFunctions|authInternals|flushUploads"`
Expected: 3 suites PASS.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in accountFunctions.tsx or either test file (pre-existing errors elsewhere out of scope).

- [ ] **Step 3: Update issue 16's completion note**

Append to the issue 16 entry's postscript in `docs/COMPLETED_ISSUES.txt` (re-read the file first — another work stream also edits it): on-device verification found supabase's signOut({scope:'local'}) requires the network before clearing the stored session, so offline force sign-out left the user signed in with wiped data; fixed with a _removeSession fallback + wipe-only-after-session-removal ordering + authInternals tripwire test. Do not commit.

- [ ] **Step 4: Report the manual verification checklist**

- Airplane mode → Sign Out → "You're offline" → Force sign out → lands on LOGIN screen; relaunch offline → still signed out.
- Note for dev builds: a red LogBox toast ("Network request failed") may still flash — that's supabase's own console.error, dev-only, cosmetic.
- Online sign-out unchanged; delete account unchanged.
