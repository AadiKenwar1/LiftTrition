# Restore Purchases Truthful Outcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Purchases reports what actually came back from RevenueCat (entitlement present → success; absent → "No purchases found") and cannot be double-fired or overlap a purchase.

**Architecture:** BillingContext owns the outcome and in-flight state: a shared `hasActiveEntitlement(info)` helper + exported `ENTITLEMENT_ID` in `billingFunctions`, a `restoring` flag in the provider. Both screens branch on the `CustomerInfo` returned by `restorePurchases()` and wrap the tap in the existing `useSubmitOnce` (F2) guard.

**Tech Stack:** React Native / Expo 54, react-native-purchases v9, Jest (jest-expo preset, react-test-renderer).

**Spec:** `docs/superpowers/specs/2026-07-14-restore-purchases-outcome-design.md`

## Global Constraints

- Entitlement identifier is exactly `'LiftTrition Pro'` — defined once as `ENTITLEMENT_ID`.
- No-purchases alert copy is exactly: title `No Purchases Found`, message `No purchases found for this Apple ID.`
- **Do NOT run any git commands** (no add/commit/branch) — the user owns all version control.
- No comments in app code unless non-obvious (project convention).
- Test commands use `npm run test:ci -- <pattern>` (`npm test` is watch mode — never use it here).

---

### Task 1: Entitlement helper in billingFunctions (TDD)

**Files:**
- Create: `context/BillingContext/functions/__tests__/billingFunctions.test.ts`
- Modify: `context/BillingContext/functions/billingFunctions.tsx` (append after the imports / at end of file)

**Interfaces:**
- Produces: `export const ENTITLEMENT_ID = 'LiftTrition Pro'` and `export function hasActiveEntitlement(info: CustomerInfo | null): boolean` — Tasks 2–4 import both.
- Consumes: existing `restorePurchases(setCustomerInfo, setError): Promise<CustomerInfo>` (unchanged; tests lock in its behavior).

- [ ] **Step 1: Write the failing test**

```ts
import Purchases, { CustomerInfo } from 'react-native-purchases'
import { ENTITLEMENT_ID, hasActiveEntitlement, restorePurchases } from '../billingFunctions'

jest.mock('react-native-purchases', () => ({
    __esModule: true,
    default: {
        restorePurchases: jest.fn(),
        purchasePackage: jest.fn(),
    },
}))

function infoWith(active: Record<string, unknown>): CustomerInfo {
    return { entitlements: { active } } as unknown as CustomerInfo
}

describe('hasActiveEntitlement', () => {
    it('is true when the Pro entitlement is active', () => {
        expect(hasActiveEntitlement(infoWith({ [ENTITLEMENT_ID]: { isActive: true } }))).toBe(true)
    })

    it('is false when no entitlements are active', () => {
        expect(hasActiveEntitlement(infoWith({}))).toBe(false)
    })

    it('is false when only a different entitlement is active', () => {
        expect(hasActiveEntitlement(infoWith({ SomethingElse: { isActive: true } }))).toBe(false)
    })

    it('is false for null customer info', () => {
        expect(hasActiveEntitlement(null)).toBe(false)
    })
})

describe('restorePurchases', () => {
    const mockRestore = Purchases.restorePurchases as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns the fresh CustomerInfo and pushes it into state', async () => {
        const fresh = infoWith({ [ENTITLEMENT_ID]: { isActive: true } })
        mockRestore.mockResolvedValue(fresh)
        const setCustomerInfo = jest.fn()
        const setError = jest.fn()

        const result = await restorePurchases(setCustomerInfo, setError)

        expect(result).toBe(fresh)
        expect(setCustomerInfo).toHaveBeenCalledWith(fresh)
        expect(setError).toHaveBeenCalledWith(null)
    })

    it('records and rethrows failures without touching customerInfo', async () => {
        const boom = new Error('network down')
        mockRestore.mockRejectedValue(boom)
        const setCustomerInfo = jest.fn()
        const setError = jest.fn()

        await expect(restorePurchases(setCustomerInfo, setError)).rejects.toThrow('network down')
        expect(setError).toHaveBeenCalledWith(boom)
        expect(setCustomerInfo).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ci -- billingFunctions`
Expected: FAIL — `hasActiveEntitlement` / `ENTITLEMENT_ID` are not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `context/BillingContext/functions/billingFunctions.tsx`:

```ts
export const ENTITLEMENT_ID = 'LiftTrition Pro'

export function hasActiveEntitlement(info: CustomerInfo | null): boolean {
    return Boolean(info?.entitlements?.active?.[ENTITLEMENT_ID])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ci -- billingFunctions`
Expected: PASS (6 tests).

---

### Task 2: `restoring` flag in BillingContext (TDD)

**Files:**
- Create: `context/BillingContext/__tests__/billingContext.test.tsx`
- Modify: `context/BillingContext/index.tsx`
- Modify: `context/BillingContext/types.ts`

**Interfaces:**
- Consumes: `hasActiveEntitlement`, `ENTITLEMENT_ID` from Task 1.
- Produces: `useBilling()` exposes `restoring: boolean`; `restorePurchases()` still resolves to `CustomerInfo`; module re-exports `ENTITLEMENT_ID` and `hasActiveEntitlement` so screens import everything from `@/context/BillingContext`.

- [ ] **Step 1: Write the failing test**

```tsx
// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import Purchases from 'react-native-purchases'
import { BillingProvider, useBilling } from '../index'
import { BillingContextInterface } from '../types'

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

jest.mock('react-native-purchases', () => ({
    __esModule: true,
    default: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        logIn: jest.fn().mockResolvedValue(undefined),
        logOut: jest.fn().mockResolvedValue(undefined),
        getOfferings: jest.fn().mockResolvedValue(null),
        getCustomerInfo: jest.fn().mockResolvedValue(null),
        restorePurchases: jest.fn(),
        addCustomerInfoUpdateListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
    LOG_LEVEL: { VERBOSE: 'VERBOSE', ERROR: 'ERROR' },
}))

let latest: BillingContextInterface

function Probe() {
    latest = useBilling()
    return null
}

async function mountProbe() {
    await act(async () => {
        create(
            <BillingProvider>
                <Probe />
            </BillingProvider>,
        )
    })
}

describe('BillingProvider restore', () => {
    const mockRestore = Purchases.restorePurchases as jest.Mock

    beforeEach(() => {
        mockRestore.mockReset()
    })

    it('exposes restoring=false initially', async () => {
        await mountProbe()
        expect(latest.restoring).toBe(false)
    })

    it('sets restoring while a restore is in flight and clears it after', async () => {
        let resolveRestore!: (info: unknown) => void
        mockRestore.mockReturnValue(
            new Promise((resolve) => {
                resolveRestore = resolve
            }),
        )
        await mountProbe()

        let pending!: Promise<unknown>
        await act(async () => {
            pending = latest.restorePurchases()
        })
        expect(latest.restoring).toBe(true)

        await act(async () => {
            resolveRestore({ entitlements: { active: {} } })
            await pending
        })
        expect(latest.restoring).toBe(false)
    })

    it('resolves with the CustomerInfo RevenueCat returned', async () => {
        const fresh = { entitlements: { active: { 'LiftTrition Pro': { isActive: true } } } }
        mockRestore.mockResolvedValue(fresh)
        await mountProbe()

        let result: unknown
        await act(async () => {
            result = await latest.restorePurchases()
        })
        expect(result).toBe(fresh)
    })

    it('clears restoring when the restore throws', async () => {
        mockRestore.mockRejectedValue(new Error('offline'))
        await mountProbe()

        await act(async () => {
            await expect(latest.restorePurchases()).rejects.toThrow('offline')
        })
        expect(latest.restoring).toBe(false)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ci -- billingContext`
Expected: FAIL — `restoring` is undefined on the context value (and missing from `BillingContextInterface`).

- [ ] **Step 3: Implement**

`context/BillingContext/types.ts` — add one line to the interface (after `loaded`):

```ts
    restoring: boolean
```

`context/BillingContext/index.tsx`:

a) Extend the functions import and re-export the shared helpers (replace the current import line 5):

```tsx
import { getAnnualPackage, getAnnualSavingsPercent, getMonthlyPackage, getPackagePriceInfo, hasActiveEntitlement, purchasePackage, restorePurchases } from './functions/billingFunctions'

export { ENTITLEMENT_ID, hasActiveEntitlement } from './functions/billingFunctions'
```

b) Add state next to the other useState calls (after `error`):

```tsx
    const [restoring, setRestoring] = useState(false)
```

c) Replace `handleRestorePurchases` (currently lines 118–120):

```tsx
    const handleRestorePurchases = useCallback(async () => {
        setRestoring(true)
        try {
            return await restorePurchases(setCustomerInfo, setError)
        } finally {
            setRestoring(false)
        }
    }, [])
```

d) Replace the `hasPremium` memo (currently lines 122–124):

```tsx
    const hasPremium = useMemo(() => hasActiveEntitlement(customerInfo), [customerInfo])
```

e) Add `restoring,` to the context `value` object (after `loaded,`) and add `restoring` to the `useMemo` dependency array.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ci -- billingContext`
Expected: PASS (4 tests). Also run `npm run test:ci -- billingFunctions` — still PASS.

---

### Task 3: subscription.tsx — truthful outcome + guards

**Files:**
- Modify: `app/settingsScreens/subscription.tsx`

**Interfaces:**
- Consumes: `restoring` + `restorePurchases` from `useBilling()`, `hasActiveEntitlement` from `@/context/BillingContext`, `useSubmitOnce` from `@/lib/hooks/useSubmitOnce`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add imports and destructure `restoring`**

Add import:

```tsx
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
```

Extend the existing `useBilling()` import line to also pull `hasActiveEntitlement` from the same module, and add `restoring` to the destructure (line 34):

```tsx
    const { loading, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, annualSavingsPercent, purchasePackage, restorePurchases, restoring, error } = useBilling()
```

(`hasActiveEntitlement` comes from the screen's existing `@/context/BillingContext` import statement — extend it.)

- [ ] **Step 2: Guard navigation while restoring**

Replace the `beforeRemove` effect body (lines 37–43):

```tsx
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (!purchasing && !restoring) return
            e.preventDefault()
        })
        return unsubscribe
    }, [navigation, purchasing, restoring])
```

- [ ] **Step 3: Replace handleRestore (lines 67–74)**

```tsx
    const [guardRestore] = useSubmitOnce()

    const handleRestore = guardRestore(
        async () => {
            try {
                const info = await restorePurchases()
                if (hasActiveEntitlement(info)) {
                    Alert.alert('Success', 'Purchases restored successfully!')
                } else {
                    Alert.alert('No Purchases Found', 'No purchases found for this Apple ID.')
                }
            } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to restore purchases. Please try again.')
            }
        },
        { retryable: true },
    )
```

- [ ] **Step 4: Mutual exclusion on the buttons**

Subscribe CTA (line 125): `disabled={!selectedPackage || purchasing || restoring || hasPremium}`

Restore link (line 144): `disabled={purchasing || restoring}` and style `(purchasing || restoring) && { opacity: 0.5 }`

Manage link (line 147): `disabled={purchasing || restoring}` and style `(purchasing || restoring) && { opacity: 0.5 }`

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 4: paywall.tsx — restore only completes onboarding when entitled

**Files:**
- Modify: `app/onboardingScreens/paywall.tsx`

**Interfaces:**
- Consumes: same as Task 3 (`restoring`, `hasActiveEntitlement`, `useSubmitOnce`), plus existing `finishOnboarding()`.

- [ ] **Step 1: Add imports and destructure `restoring`**

Same import additions as Task 3; extend line 35:

```tsx
    const { loading, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, annualSavingsPercent, purchasePackage, restorePurchases, restoring, error } = useBilling()
```

- [ ] **Step 2: Replace handleRestore (lines 85–92)**

```tsx
    const [guardRestore] = useSubmitOnce()

    const handleRestore = guardRestore(
        async () => {
            try {
                const info = await restorePurchases()
                if (hasActiveEntitlement(info)) {
                    await finishOnboarding()
                } else {
                    Alert.alert('No Purchases Found', 'No purchases found for this Apple ID.')
                }
            } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to restore purchases. Please try again.')
            }
        },
        { retryable: true },
    )
```

- [ ] **Step 3: Mutual exclusion on the buttons**

CTA (line 147): `disabled={!selectedPackage || purchasing || restoring || hasPremium}`

Restore (line 165): `disabled={purchasing || restoring}`, style `[styles.restore, (purchasing || restoring) && styles.footerDisabled]`

Footer Back (line 179): `disabled={purchasing || restoring}`, style `[styles.backButton, (purchasing || restoring) && styles.footerDisabled]`

Footer Maybe later (line 182): `disabled={purchasing || restoring}`, style `[styles.laterButton, (purchasing || restoring) && styles.footerDisabled]`

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 5: Full verification + audit bookkeeping

**Files:**
- Modify: `docs/AUDIT_MAJOR.txt` (remove issue 20), `docs/COMPLETED_ISSUES.txt` (append issue 20 entry, matching the file's existing completed-entry format)

- [ ] **Step 1: Run the full suite**

Run: `npm run test:ci`
Expected: all suites PASS (including the two new billing suites).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Move issue 20 to COMPLETED_ISSUES.txt**

Follow the existing format in `docs/COMPLETED_ISSUES.txt` (issue text + PLAN + what shipped). Do not commit — the user owns git.

- [ ] **Step 4: Report manual verification checklist to the user**

- Never-subscribed Apple ID → Restore → "No purchases found for this Apple ID.", features stay locked, onboarding NOT completed.
- Subscribed Apple ID → Restore → success alert / onboarding completes; UI unlocks via `hasPremium`.
- Double-tap Restore fires once; Restore disabled while purchasing and vice versa; can't leave subscription screen or paywall mid-restore.
