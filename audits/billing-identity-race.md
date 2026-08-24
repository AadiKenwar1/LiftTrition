# Billing Identity Race & Dead Back-Block — Problem, Solution, Fixes, Test Plan

**Generated:** 2026-07-29 · **Scope:** `context/BillingContext`, `app/settingsScreens/subscription.tsx`, `app/onboardingScreens/paywall.tsx`
**Method:** three parallel exploration passes (billing race surface, navigation architecture, premium-gate blast radius) + one design pass; every finding anchored to a `file:line` that was read.
**Status:** findings verified · design locked · tests partially written (one deliberately red) · **implementation not started**

> **Superseded 2026-08-20 — decision 2 (the back-block) reversed.** `usePreventRemove` was removed
> from `subscription.tsx`. It set `preventNativeDismiss`, and on iOS 26 `react-native-screens`
> 4.16.0 disables touch on the back chevron in `navigationBar:shouldPopItem:` and only restores it
> in `didPopItem:` — which does not run when a dismiss is prevented. Tapping back during a purchase
> therefore killed the chevron permanently, and with global `gestureEnabled:false` there was no other
> way off the screen. The guard was also protecting little: `purchasePackage` settles against
> `BillingProvider`, which outlives the screen, so leaving mid-payment still lands the entitlement.
> The rest of this document (the identity race and its guard) still stands; passages specifically
> about the back-block — §2 decision 2, §3 item 4's `usePreventRemove` bullet, §4.4's old cases 1–2,
> §4.5's chevron-tap step, and §5's native-pop-cancellation gap — describe the reversed plan and are
> superseded along with it.

---

## 1. The problem

### The incident

A sandbox purchase logged `Updating CustomerInfo '$RCAnonymousID:9449c…'`. That specific incident turned out benign (the line prints `originalAppUserId`, a permanent cosmetic label; the customer record was correctly aliased to the Supabase UUID — proven by the server-side entitlement gate passing). But the investigation confirmed the race it *looked* like is real and open.

### The mechanism

RevenueCat holds its own identity, separate from Supabase auth, and the two log in independently:

1. `Purchases.configure({ apiKey })` runs with **no `appUserID`** (`context/BillingContext/index.tsx:30-40`) — on first run the SDK mints an anonymous ID.
2. `Purchases.logIn(user.id)` runs in a second effect (`index.tsx:83`) — a **network call** that adopts the Supabase UUID when it resolves.
3. Anything bought before step 2 resolves attaches the App Store receipt to the **anonymous customer**.
4. The Edge Functions verify entitlement server-side by **Supabase `user.id`** (`lib/supabase/functions/fetchOpenAI/entitlement.ts:42`, byte-identical copy in `fetchFoodDB/`) and fail closed.

Result of a purchase in the gap: client `hasPremium` goes true (it reads whatever customer the SDK currently is), every paid server call 403s. The user paid and the paid features stay locked — the worst failure a paid app has, and it is silent (no crash, no telemetry, no user-visible cause).

### Findings (all verified `file:line`)

| ID | Finding | Anchor |
|----|---------|--------|
| F1 | **The window recurs ~hourly, not just cold start.** `PowerSyncGuard` keys on the `session` *object*, which Supabase replaces on every token refresh → the provider subtree (incl. `BillingProvider`) unmounts/remounts → `configure` + `logIn` re-run from scratch each time. | `components/GuardComponents/PowerSyncGuard.tsx:27,45-54` · `lib/hooks/useAsyncLoad.ts:24` · `context/AuthContext/index.tsx:33-36,71-76` |
| F2 | **The 15s init timeout un-gates the entire app**, not just billing: it flips `loaded`/`billingLoading` while `logIn` is still pending, and `allContextsLoaded` gates the whole navigator. Billing is excluded from `anyLoadFailed`, so it has no retry affordance. | `context/BillingContext/index.tsx:74-79` · `app/_layout.tsx:132,141-147` |
| F3 | **Subscribe being pre-identity-safe is an accident.** Offerings are fetched only *after* `logIn` resolves, so `selectedPackage` is null and the CTA disables itself. Load-bearing ordering with no comment or test protecting it. | `context/BillingContext/index.tsx:83→86` |
| F4 | **Restore Purchases is the reachable money path.** Needs no package; gated only on `purchasing \|\| restoring`. A pre-identity restore attaches the receipt to the anonymous customer; on the onboarding paywall it also **completes onboarding**. | `app/settingsScreens/subscription.tsx:155` · `app/onboardingScreens/paywall.tsx:181,99` |
| F5 | **A failed `logIn` = permanently anonymous session.** Rejection is caught into `setError`; `finally` still sets `loaded:true`; no retry, no re-arm; the purchase/restore wrappers check nothing. | `context/BillingContext/index.tsx:90-99,120-131` · `functions/billingFunctions.tsx:53-76` |
| F6 | **Nothing ever verifies identity.** Zero occurrences of `getAppUserID` / `isAnonymous` / `isConfigured` in app code; the SDK exposes all three. The divergence is undetectable at runtime. | (repo-wide grep) · `node_modules/react-native-purchases/dist/purchases.d.ts:290,415,838` |
| F7 | **Billing is observability-dark.** Timeout + `logIn` failure are `console.warn` only; Sentry.init has no console integration; both client 403 branches are deliberately uncaptured and tests pin the absence. | `context/BillingContext/index.tsx:57,76` · `app/_layout.tsx:70-73` · `lib/foodDB/__tests__/foodDB.test.ts:113` · `lib/openAI/__tests__/openAI.test.ts:85` |
| F8 | **Stale offerings on direct account switch.** `setOfferings(null)` exists only in the `!user?.id` branch; a user-1→user-2 switch keeps user-1's packages while `logIn(user-2)` is pending. | `context/BillingContext/index.tsx:62` |
| F9 | **Blast radius in the disagreement state:** food DB alerts "Search Failed / Couldn't verify your subscription…" on every debounce settle (no backoff, 403s never cached); AI photo scan loops "Analysis Failed → Try Again → re-upload → 403" forever with `cancelable:false`; text describe fails with one OK; settings shows a lying PRO badge; the subscription screen is a dead end ("Subscription Active", CTA disabled). A 403 consumes no quota. | `app/nutritionScreens/foodDBModal.tsx:80-99` · `app/nutritionScreens/analyzingModal.tsx:101-124` · `app/(tabs)/settings.tsx:166` |
| F10 | **Error-copy drift risk.** `foodDB.ts` exports `FOOD_SEARCH_PREMIUM_MESSAGE`; `openAI.ts` duplicates the literal; `foodDBModal` matches by exact string equality — drift silently downgrades to misleading "check your connection" copy. | `lib/foodDB/foodDB.ts:18` · `lib/openAI/openAI.ts:65-67` · `app/nutritionScreens/foodDBModal.tsx:80-99` |
| F11 | **The stale-`logIn` flip.** On account switch, a slow `logIn(user-1)` resolving *after* `logIn(user-2)` silently flips the **native SDK identity** back to user-1 while React state says user-2. The effect's `cancelled` flag protects React state only; it cannot un-call the SDK. | `context/BillingContext/index.tsx:44,61-116` |

### Second problem: the back-block guard provably does nothing

`subscription.tsx:41-47` registers `beforeRemove` + `e.preventDefault()` to hold the screen mid-purchase. On iOS native-stack this cannot work: the chevron is a UIKit button and **UIKit pops the view controller before any JS runs**. The `beforeRemove` event only *reports* a pop that already happened; vetoing it desyncs JS state from native, which is exactly the logged warning (`The screen 'settingsScreens/subscription' was removed natively but didn't get removed from JS state`). Confirmed through the native source: `RNSScreen.mm viewDidDisappear → onDismissed → NativeStackView pop dispatch → useDismissedRouteError`.

The supported mechanism, **`usePreventRemove`**, works in the opposite direction — it publishes intent ahead of time (`preventNativeDismiss` on the screen) so UIKit cancels the pop natively, then notifies JS. It is installed and fully wired in the shipped versions: `@react-navigation/native` 7.1.28 re-exports it from core 7.14.0; native-stack 7.11.0 maps `preventedRoutes → preventNativeDismiss` and auto-forces `headerBackButtonMenuEnabled:false` (blocks the long-press multi-pop menu too); react-native-screens 4.16.0 implements the iOS cancellation; expo-router 6.0.22's fork delegates to the real `NativeStackView`. No upgrades needed. Constraints honored: no custom `headerLeft` (iOS 26 Liquid Glass rule), never set `headerBackButtonMenuEnabled:true`, global `gestureEnabled:false` means the chevron is the only escape. The onboarding paywall needs **no** guard (`headerShown:false`, no gesture, all escapes already disabled while `purchasing || restoring`).

---

## 2. The solution

### Locked decisions

1. **Timeout:** the app shell still un-gates after 15s (a RevenueCat outage must never brick the app). Purchase **and** restore get a hard **call-time identity guard**; CTAs disable proactively with a note until identity verifies.
2. **Back-block:** `usePreventRemove(purchasing || restoring, noop)` — silent, no alert.
3. **F1 remount fix: out of scope** — separate follow-up (touches PowerSync/auth architecture, known caveat H6).
4. **No Sentry / telemetry** — existing `console.warn`s stay (plus one on initial `logIn` failure); F7 remains a documented gap; the Dev Stats identity row is the runtime visibility.
5. **Guard rejection copy:** `"Purchases not available. Please try again later."`

### The call-time identity guard

At the moment money moves, compare the SDK's current identity to the signed-in user:

```
ensureBillingIdentity(expectedUserId, status):
  expectedUserId null                      → throw BillingIdentityError('no-user')
  actual ← Purchases.getAppUserID()          (local read, no network; rejection ⇒ unknown ⇒ mismatch)
  actual === expectedUserId                → return                       // happy path: ~0ms
  status === 'pending'                     → throw BillingIdentityError('identity-pending')
                                             // initial logIn in flight — never stack a second logIn
  Purchases.logIn(expectedUserId)            // the single self-heal retry
    rejection                              → throw BillingIdentityError('login-retry-failed')
  re-read getAppUserID(); still ≠ expected → throw BillingIdentityError('mismatch-after-retry')
  return
```

Why this shape:

- **One choke point beats per-race fixes.** Timeout window, failed logIn, stale-logIn flip (F11), account switch — and races not yet imagined — all fail the same comparison.
- **The happy path is free.** `getAppUserID()` is a local read, and identity is cached on disk across launches — on a warm start the IDs already match even while the re-login is still pending. The blocking states are genuinely only first-ever login, post-sign-out, and post-failure.
- **It can only block, never enable.** Purchase still requires offerings, which still require a successful initial `logIn` (F3 stays true, now documented and guarded rather than accidental).
- Enforcement lives in the context wrappers — the single funnel both screens call — satisfying the single-copy requirement (audit med-023: subscribe/restore logic is duplicated across the two screens; the guard must not be).

### Known limits of the fix (accepted)

- **Check-then-act, not atomic** — a TOCTOU window exists between guard and store call; unexploitable in practice (sign-out unreachable mid-purchase, remount re-login is a same-ID no-op, screen held).
- **Right app account, wrong human** — the guard proves RevenueCat = Supabase user; it cannot prove the device's Apple ID belongs to that person (shared-device restore semantics are a RevenueCat/product matter, pre-existing).
- **Dashboard dependency** — legacy anonymous entitlements self-heal via aliasing only if RevenueCat's "transfer purchases" setting is default. One-time dashboard check.
- **No telemetry** (decision 4) — if the guard fires widely in production, the first signal is support tickets.
- **Display side ungated** — the guard protects money, not pixels; `hasPremium`/PRO badge can still briefly reflect the wrong customer in a mismatch window. Once purchases can't land anonymously, that state stops being creatable, so F9's blast radius becomes vestigial going forward.
- **Trapped screen on a never-settling purchase** — silent block + `purchasing` stuck true = force-quit is the exit. StoreKit settles in practice; an N-minute escape hatch is optional future hardening.
- **The fix's own worst-case bug is over-blocking** — a wrong `identityReady` transition silently turns off revenue. The positive-control test cases exist precisely for this.

---

## 3. The fixes (file by file)

| # | File | Change |
|---|------|--------|
| 1 | `context/BillingContext/functions/identityGuard.ts` **(new)** | `BillingIdentityStatus` (`'none'\|'pending'\|'verified'\|'failed'`) · `BillingIdentityError extends Error` with `reason` (`'no-user'\|'identity-pending'\|'login-retry-failed'\|'mismatch-after-retry'`) · exported message constant `"Purchases not available. Please try again later."` · `ensureBillingIdentity()` per the algorithm above |
| 2 | `context/BillingContext/index.tsx` | Module-level `purchasesConfigured` flag guarding `configure` (sync; `isConfigured()` is async and racy) · `identityStatusRef` + `identityReady` state via `markIdentityStatus()` — `'pending'` at init start, `'verified'` after `logIn` resolves, `'failed'` on rejection (inner try/catch scoped to the `logIn` await so a later `getOfferings` failure isn't mislabeled; `console.warn` on failure, no telemetry) · clear `offerings`+`customerInfo` when `user.id` changes to a *different* non-null id (F8) · `guardIdentity` runs at the top of `handlePurchasePackage` and inside `handleRestorePurchases`'s try (so `finally` still clears `restoring`) · add `identityReady` to the context value · re-export `BillingIdentityError` |
| 3 | `context/BillingContext/types.ts` | Add `identityReady: boolean` to `BillingContextInterface` (only interface change; `offerings: any` untouched — med-022 out of scope) |
| 4 | `app/settingsScreens/subscription.tsx` | Delete the dead `beforeRemove` effect (:41-47) + unused imports · add `usePreventRemove(purchasing \|\| restoring, () => {})` with a one-line comment on the native mechanism · rewrite the header doc comment honestly (it currently claims the guard works) · CTA :136 and Restore :155 gain `\|\| !identityReady` (disabled + dim) · note "Finishing account setup — purchases will be available in a moment." above the CTA when `!identityReady && !hasPremium` · no `headerLeft`, no `headerBackButtonMenuEnabled` |
| 5 | `app/onboardingScreens/paywall.tsx` | CTA :163 and Restore :181 gain `\|\| !identityReady` + the same note · footer Back / Maybe-later **not** gated on identity (must stay usable when RevenueCat is down — the point of the timeout un-gate) · no nav guard needed (verified: no back affordance exists) |
| 6 | `components/devTest/DevStatsModal.tsx` (dev-exempt) | New "RevenueCat identity" section: poll `Purchases.getAppUserID()` every 5s (existing poll pattern) · show RC id vs Supabase uid with ok/warn styling + `identityReady` · catch → "unavailable (SDK not configured?)" |
| 7 | `context/BillingContext/__tests__/README.md` | Update harness notes (`getAppUserID` in both factories) · rewrite the "fails today, deliberately" bullet (guarantee now implemented) · prune resolved gaps · add F1 remount amplifier + no-telemetry as known out-of-scope gaps · keep "client/server agreement needs sandbox" and "configure never asserted" |
| 8 | `tests/billingcontext.md` **(new**, from `tests/_templates/area.md`**)** | Product-language guarantees + Not proven (see §5) · footer `Area: context/BillingContext · <real case count> · reviewed 2026-07-29` |

Explicit follow-ups **not** in this pass: F1 remount fix (H6) · offerings re-fetch / billing `retryLoad` after a failed init · F10 shared error-copy constant · any billing telemetry · `useSubmitOnce` on `handleSubscribe` (adjacent pre-existing one-frame double-tap race; StoreKit serializes).

---

## 4. Test cases

State & concurrency kind → transition coverage, per `tests/README.md`. Test-first: cases 1–4 land before the implementation.

### 4.1 `context/BillingContext/__tests__/billingIdentity.test.tsx` — exists, extends 11 → 20 cases

Harness: `react-test-renderer` + `Probe` capturing the context value; RC SDK fully mocked (`mockAuthState` hoisting pattern); **add** `getAppUserID: jest.fn()` defaulting to an anonymous id; `deferred()` promises to hold the provider inside the pre-identity window.

Existing 11 (written 2026-07-29, all passing except #4):

| # | Case | Status |
|---|------|--------|
| 1 | identifies the authenticated user to RevenueCat | ✅ |
| 2 | does not report `loaded` while the identity call is in flight | ✅ |
| 3 | reads no subscription state (offerings/customerInfo) until identity resolves | ✅ |
| 4 | **never reaches the store while the app user id is unresolved** | 🔴 **deliberately red — goes green via the guard's `'identity-pending'` rejection** |
| 5 | grants no premium when identification fails | ✅ |
| 6 | surfaces a failed identification rather than continuing quietly | ✅ |
| 7 | re-identifies after sign-out → sign-in as someone else | ✅ |
| 8 | clears the previous user's subscription state on sign-out | ✅ |
| 9 | does not log out when no user was ever identified | ✅ |
| 10 | waits for auth before identifying anyone | ✅ |
| 11 | ignores an identity call that resolves after the user changed (React-state half of F11) | ✅ |

New 9:

| # | Case | Pins |
|---|------|------|
| 12 | reaches the store once identity is verified | **Positive control** — a guard that rejects everything must fail this |
| 13 | timeout fires → `loaded === true` AND purchase still rejects (fake timers, deferred `logIn`) | Decision 1: shell un-gates, store stays blocked |
| 14 | restore blocked identically while identity unresolved; `restoring` cleared after rejection | F4, and the `finally` placement |
| 15 | self-heal: init `logIn` failed → purchase triggers exactly one retry `logIn` → store reached | The single-retry semantics |
| 16 | retry `logIn` also fails → typed error, store never called | `'login-retry-failed'` |
| 17 | retry succeeds but id still differs → typed error, store never called | `'mismatch-after-retry'` |
| 18 | `identityReady` lifecycle: false while pending → true on resolve → false again on user switch | The CTA-disable signal |
| 19 | `identityReady` stays false when identification fails | Pairs with #5 |
| 20 | account switch clears offerings + customerInfo while the new `logIn` is pending | F8 fix |

### 4.2 `context/BillingContext/functions/__tests__/identityGuard.test.ts` — new, 8 cases

Persistence & integration kind — failure matrix over the SDK contract. Mocks `getAppUserID` + `logIn` only.

| # | Case |
|---|------|
| 1 | resolves without calling `logIn` when the SDK already reports the expected user (happy path = one local read) |
| 2 | throws `'no-user'` without touching the SDK when the expected id is null |
| 3 | throws `'identity-pending'` without calling `logIn` when status is `'pending'` and ids differ (never stacks a second logIn) |
| 4 | logs in exactly once with the expected id and resolves when the retry lands the match |
| 5 | wraps a rejected retry `logIn` in `BillingIdentityError('login-retry-failed')` |
| 6 | throws `'mismatch-after-retry'` when ids still differ after a successful retry `logIn` |
| 7 | treats a rejected `getAppUserID` (SDK unconfigured) as unknown identity → falls into the retry branch instead of crashing untyped |
| 8 | every rejection carries the exported message constant `"Purchases not available. Please try again later."` (parameterized over all reasons; import the constant, never copy the string) |

### 4.3 `context/BillingContext/__tests__/billingContext.test.tsx` — harness-only edit, 4 cases unchanged

Its restore cases now route through the guard; add `getAppUserID: jest.fn().mockResolvedValue('user-1')` to the factory so all 4 stay green with zero body changes.

### 4.4 `app/settingsScreens/__tests__/subscription.test.tsx` — new, 4 cases

Screen ships (no dev exemption) and the `usePreventRemove` wiring has no context-level backstop. Mock `usePreventRemove` capture-args style (assert the **last** call — the hook runs every render); mock `@/context/BillingContext` via a reassignable `mockBillingState`.

| # | Case |
|---|------|
| 1 | holds the screen while a purchase is in flight and releases after (hook arg false → press CTA → true → resolve → false) |
| 2 | holds the screen while a restore is in flight |
| 3 | `identityReady:false` → CTA disabled, Restore disabled, setup note rendered |
| 4 | `identityReady:true` → CTA enabled, note absent (positive control) |

No paywall screen test: the money-safety enforcement is the single-copy context guard (pinned at provider level); paywall's `!identityReady` disable is the same presentation pattern pinned once in 4.4, and a missed wire still surfaces the guard's typed error through paywall's existing generic Alert — a duplicate case proves nothing new.

### 4.5 Verification gate

1. `npm run typecheck` → 0 errors
2. `npx jest context/BillingContext --ci` → 4 suites / **38 green** (billingIdentity 20 incl. the formerly-red #4 · billingContext 4 · billingFunctions 6 · identityGuard 8)
3. `npx jest app/settingsScreens --ci` → 4 green
4. `npm run test:ci` → full suite green (the only prior red is now green)
5. Manual (iOS dev build, sandbox account): normal launch → CTA enabled, Dev Stats ids match · launch with `api.revenuecat.com` blocked → shell opens ~15s, note shown, CTA+Restore disabled, timeout warn in Metro · restore after network returns → exactly one `logIn` then the restore (self-heal) · mid-purchase chevron tap → screen holds, **no** `beforeRemove` warning, pops normally after the success alert · paywall escapes dead while purchasing · account switch blanks prices immediately · Fast Refresh → no duplicate-configure warnings

---

## 5. What remains unproven (goes in `tests/billingcontext.md` § Not proven)

- **Client and server agreeing on entitlement** — `hasPremium` and `hasPremiumEntitlement(userId)` answer different questions about different records; only a real sandbox purchase crosses that boundary. Jest cannot.
- **The F1 remount amplifier** — provider remount on token refresh re-runs init mid-session; out-of-scope follow-up.
- **Native pop cancellation itself** — OS/library behavior; only our wiring to `usePreventRemove` is pinned. An expo-router major bump could change the fork's delegation.
- **`configure` ordering** — RevenueCat keys are absent under Jest, so `configure` never runs in tests.
- **Billing telemetry** — none exists, by decision; production guard-rejection frequency is unmeasurable.
