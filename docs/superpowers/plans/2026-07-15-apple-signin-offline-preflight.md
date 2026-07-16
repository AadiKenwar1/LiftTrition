# Apple Sign-In Offline Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the device is definitely offline, tapping "Sign in with Apple" shows a friendly alert immediately and never opens the Apple sign-in sheet.

**Architecture:** A fast preflight at the top of `signInWithApple` using `expo-network`'s `getNetworkStateAsync()` (reads OS-cached state locally, returns in ms). Block only when `isConnected === false`; proceed on `true`, `undefined`, or a thrown check (fail-open). Rest of the function unchanged.

**Tech Stack:** React Native / Expo 54, expo-network 8.0.8 (installed), expo-apple-authentication, Supabase auth, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-07-15-apple-signin-offline-preflight-design.md`

## Global Constraints

- Offline alert copy is exactly: title `You're offline`, message `Sign in with Apple needs an internet connection.`
- Block ONLY on `state.isConnected === false`. `undefined`/`true` → proceed. Thrown check → proceed (fail-open).
- **Do NOT run any git commands** (no add/commit/branch) — the user owns all version control.
- Comments only when non-obvious (the fail-open swallow IS non-obvious — one line explaining why).
- Test command: `npm run test:ci -- <pattern>` (`npm test` is watch mode — never use it here).
- Pre-existing failing suites and pre-existing `tsc` errors are out of scope; only touched files must be clean.
- `expo-network` is already installed (8.0.8, via `expo install`); no config plugin needed, autolinks.

---

### Task 1: Offline preflight in signInWithApple (TDD)

**Files:**
- Create: `context/AuthContext/functions/__tests__/authFunctions.test.ts`
- Modify: `context/AuthContext/functions/authFunctions.tsx`

**Interfaces:**
- Consumes: `Network.getNetworkStateAsync()` from `expo-network` (returns `Promise<{ isConnected?: boolean; isInternetReachable?: boolean; type?: string }>`); existing `AppleAuthentication.signInAsync`, `supabase.auth.signInWithIdToken`.
- Produces: `signInWithApple(): Promise<void>` unchanged signature; new behavior = early return with alert when offline.

- [ ] **Step 1: Write the failing test**

```ts
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Network from 'expo-network'
import { Alert } from 'react-native'
import { supabase } from '@/lib/supabase/client'
import { signInWithApple } from '../authFunctions'

jest.mock('expo-network', () => ({
    getNetworkStateAsync: jest.fn(),
}))

jest.mock('expo-apple-authentication', () => ({
    signInAsync: jest.fn(),
    AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
}))

jest.mock('@/lib/supabase/client', () => ({
    supabase: { auth: { signInWithIdToken: jest.fn() } },
}))

const mockNetwork = Network.getNetworkStateAsync as jest.Mock
const mockAppleSignIn = AppleAuthentication.signInAsync as jest.Mock
const mockIdTokenSignIn = supabase.auth.signInWithIdToken as jest.Mock

let alertSpy: jest.SpyInstance

beforeEach(() => {
    jest.clearAllMocks()
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    mockNetwork.mockResolvedValue({ isConnected: true })
    mockAppleSignIn.mockResolvedValue({ identityToken: 'apple-token' })
    mockIdTokenSignIn.mockResolvedValue({ error: null })
})

afterEach(() => {
    alertSpy.mockRestore()
})

describe('signInWithApple offline preflight', () => {
    it('blocks with a friendly alert and never opens the Apple sheet when offline', async () => {
        mockNetwork.mockResolvedValue({ isConnected: false })

        await signInWithApple()

        expect(alertSpy).toHaveBeenCalledWith("You're offline", 'Sign in with Apple needs an internet connection.')
        expect(mockAppleSignIn).not.toHaveBeenCalled()
        expect(mockIdTokenSignIn).not.toHaveBeenCalled()
    })

    it('proceeds to the Apple sheet when connected', async () => {
        mockNetwork.mockResolvedValue({ isConnected: true })

        await signInWithApple()

        expect(mockAppleSignIn).toHaveBeenCalledTimes(1)
        expect(mockIdTokenSignIn).toHaveBeenCalledTimes(1)
        expect(alertSpy).not.toHaveBeenCalled()
    })

    it('proceeds when connectivity is unknown (isConnected undefined)', async () => {
        mockNetwork.mockResolvedValue({ isConnected: undefined })

        await signInWithApple()

        expect(mockAppleSignIn).toHaveBeenCalledTimes(1)
    })

    it('proceeds (fail-open) when the network check itself throws', async () => {
        mockNetwork.mockRejectedValue(new Error('network module unavailable'))

        await signInWithApple()

        expect(mockAppleSignIn).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ci -- authFunctions`
Expected: FAIL — first test fails because the Apple sheet is still called offline (no preflight yet).

- [ ] **Step 3: Implement the preflight**

In `context/AuthContext/functions/authFunctions.tsx`, add the import and the preflight block at the very top of the `try` in `signInWithApple`:

```tsx
import { supabase } from '@/lib/supabase/client'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Network from 'expo-network'
import { Alert } from 'react-native'

export async function signInWithApple(): Promise<void> {
  try {
    let offline = false
    try {
      const state = await Network.getNetworkStateAsync()
      offline = state.isConnected === false
    } catch {
      // fail-open: a broken network check must never block a sign-in that could work
    }
    if (offline) {
      Alert.alert("You're offline", 'Sign in with Apple needs an internet connection.')
      return
    }

    // Show native Apple Sign In UI
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    // Send identity token to Supabase
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
    })

    if (error) throw error
  }
  catch (e: any) {
    if (e.code === 'ERR_REQUEST_CANCELED') {
      return
    }

    Alert.alert('Sign In Error', e.message || 'Failed to sign in with Apple')
  }
}
```

(Only the import line for `expo-network` and the preflight block are new; everything else is the existing function verbatim.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ci -- authFunctions`
Expected: PASS (4 tests).

---

### Task 2: Full verification + docs

**Files:**
- Modify: `docs/AUDIT_MINOR.txt` OR `docs/COMPLETED_ISSUES.txt` only if this maps to a tracked issue (check first; this was a conversational feature request, so it may not correspond to a numbered audit item — if none matches, skip doc bookkeeping and just report).

- [ ] **Step 1: Run the new suite + confirm no regressions in related auth suites**

Run: `npm run test:ci -- "authFunctions|accountFunctions"`
Expected: both suites PASS (authFunctions 4, accountFunctions 16).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `authFunctions.tsx` or the new test file (28 pre-existing errors elsewhere are out of scope; confirm the count did not rise on touched files).

- [ ] **Step 3: Confirm package.json records expo-network**

Run: `npm run test:ci -- authFunctions` already imports it; additionally verify `expo-network` is in `dependencies` (it was added by `expo install`). Grep `package.json` for `"expo-network"`.

- [ ] **Step 4: Report the manual verification checklist to the user**

- **Requires an EAS dev-client rebuild** (new native module) before it can run on device.
- Airplane mode ON → tap Sign in with Apple → friendly "You're offline" alert appears immediately, NO Face ID / Apple sheet.
- Airplane mode OFF → normal sign-in, no regression.
- Captive-portal caveat (known, out of scope): on wifi with a login wall the preflight sees "connected" and proceeds; the real request then fails with the existing generic error. Layer 2 (friendly mapping of that error) was deferred.
