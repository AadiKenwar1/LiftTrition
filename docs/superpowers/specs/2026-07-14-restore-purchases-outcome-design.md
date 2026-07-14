# Restore Purchases: Truthful Outcome + In-Flight Guard (AUDIT_MAJOR issue 20)

**Date:** 2026-07-14
**Status:** Approved (design presented in conversation; user approved before spec was written)

## Problem

`Purchases.restorePurchases()` resolves successfully even when the user has
nothing to restore — success means "Apple's records were checked", not "a
purchase was found". Both restore handlers treat resolution as restoration:

- `app/settingsScreens/subscription.tsx` shows "Purchases restored
  successfully!" to users who never subscribed, while everything stays locked.
- `app/onboardingScreens/paywall.tsx` calls `finishOnboarding()`
  unconditionally, letting a free user skip the paywall entirely.

Neither handler models in-flight state, so Restore can be double-fired or run
concurrently with a purchase.

## Verified against RevenueCat docs (react-native-purchases v9)

- `restorePurchases(): Promise<CustomerInfo>` — returns updated customer info
  with restored entitlements; throws only on real failures.
- The documented access check is membership in `customerInfo.entitlements.active`
  (e.g. `'pro' in customerInfo.entitlements.active`).

## Approaches considered

1. **Screen-local checks + local flags** — each screen inspects the returned
   info and keeps its own `restoring` state. Rejected: outcome logic and the
   entitlement literal get duplicated; mutual exclusion with purchase stays
   improvised per screen.
2. **BillingContext owns outcome + in-flight state** (chosen, per audit plan):
   the context already returns `CustomerInfo` from `restorePurchases`; add a
   shared `restoring` flag and a single entitlement check helper. Screens only
   branch on truth.
3. **Derive outcome from `hasPremium` after restore** — rejected: `hasPremium`
   updates via async state, so reading it right after `await restorePurchases()`
   races a render; the returned `CustomerInfo` is the synchronous truth.

## Design

### 1. `context/BillingContext/functions/billingFunctions.tsx`

- Export `ENTITLEMENT_ID = 'LiftTrition Pro'` (dedupes the literal; shared with
  issue 4's server-side check later).
- Export `hasActiveEntitlement(info: CustomerInfo | null): boolean` —
  `Boolean(info?.entitlements?.active?.[ENTITLEMENT_ID])`. Single source of
  truth for "is entitled", used by `hasPremium` and both restore handlers.
- `restorePurchases` already returns the fresh `CustomerInfo`; unchanged.

### 2. `context/BillingContext/index.tsx` + `types.ts`

- New state `restoring: boolean`; `handleRestorePurchases` sets it true before
  the call and false in `finally`.
- `hasPremium` uses `hasActiveEntitlement(customerInfo)`.
- Context value gains `restoring`; `BillingContextInterface` gains
  `restoring: boolean`.
- Re-export `ENTITLEMENT_ID` and `hasActiveEntitlement` from the context module
  so screens keep a single import path (`@/context/BillingContext`).

### 3. `app/settingsScreens/subscription.tsx`

- `handleRestore` becomes a `useSubmitOnce` guarded handler (F2 pattern,
  `{ retryable: true }` since the screen stays mounted):
  - `const info = await restorePurchases()`
  - `hasActiveEntitlement(info)` → `Alert('Success', 'Purchases restored successfully!')`
  - else → `Alert('No Purchases Found', 'No purchases found for this Apple ID.')`
  - catch unchanged (error alert).
- Mutual exclusion: Subscribe CTA, Restore link, and Manage link disable on
  `purchasing || restoring`; `beforeRemove` blocks navigation while
  `purchasing || restoring`.

### 4. `app/onboardingScreens/paywall.tsx`

- Same guarded `handleRestore`, but the restored branch calls
  `await finishOnboarding()`; the not-restored branch shows the same
  "No purchases found" alert and leaves the user on the paywall (subscribe /
  Maybe later still available).
- CTA, Restore, and the footer back button disable on `purchasing || restoring`.

## Error handling

- Real failures (network, uninitialized SDK) still throw from
  `restorePurchases` → existing catch blocks show the error alert. `setError`
  in `billingFunctions.restorePurchases` is unchanged.
- `restoring` resets in `finally`, so a thrown restore never wedges the UI.

## Testing

- New `context/BillingContext/functions/__tests__/billingFunctions.test.ts`
  (TDD): `hasActiveEntitlement` truth table (active entitlement present /
  absent / empty / null info); `restorePurchases` returns the fresh info,
  pushes it through `setCustomerInfo`, and rethrows + records errors
  (mock `react-native-purchases`).
- New `context/BillingContext/__tests__/billingContext.test.tsx`: provider-level
  test (mock `@/context/AuthContext` + `react-native-purchases`) asserting
  `restoring` is true while a restore is in flight and false after, and that
  `restorePurchases` resolves to the returned info. Dropped if the provider
  proves untestable without excessive mocking — double-tap semantics are
  already covered by `useSubmitOnce`'s own tests.
- Manual verify (audit): never-subscribed → "No purchases found", features
  locked, onboarding NOT completed; subscribed → restore unlocks; double-tap
  fires once; purchase and restore cannot run concurrently.

## Out of scope

- Issue 4 (server-side entitlement check) — only the shared `ENTITLEMENT_ID`
  export anticipates it.
- Any paywall/subscription visual changes.
