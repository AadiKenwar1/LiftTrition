# BillingContext provider tests

## Logic kind

**State & concurrency.** Both files here drive `BillingProvider` through transitions rather
than checking return values: `billingContext.test.tsx` covers the restore flow's in-flight
flag, `billingIdentity.test.tsx` covers who RevenueCat thinks the user is and what must not
happen before that is settled. The bar for this kind is transition coverage, not a case count —
states × events, including the events that should be refused.

The pure helpers those tests lean on (`hasActiveEntitlement`, `purchasePackage`,
`restorePurchases`, `ensureBillingIdentity`) are tested separately in
`../functions/__tests__/`.

## Harness

`react-test-renderer` renders `<BillingProvider>` around a `Probe` that assigns the context
value to a module-level `latest` on every render. Assertions read `latest` after an `act`.
Everything the provider touches is mocked:

- **`react-native-purchases`** — a bare object of `jest.fn()`s, including `getAppUserID`
  (the identity guard's local read; `beforeEach` defaults it to `'user-1'`, what the native
  SDK would report after `configure({ appUserID: 'user-1' })`). Each test sets the return
  values it needs in the body.
- **`@/lib/env`** — static fake RevenueCat keys, so the provider's configure path actually
  runs under Jest (no .env is loaded there) and `Purchases.configure` is asserted, ordering
  included. The no-key case mutates the imported `ENV` object; `beforeEach` restores it.
- **`@/context/AuthContext`** — `useAuth` reads a module-level `mockAuthState`, so a test moves
  the signed-in user by reassigning it and calling `rerender(root)`. The `mock` prefix on that
  variable is mandatory: `jest.mock` factories are hoisted above every other declaration, and
  Jest rejects out-of-scope references that aren't prefixed.
- **AsyncStorage** — the official in-memory mock, from `jest.setup.js` (the provider reads
  `forceFreeMode` through it).

`resetSdkIdentityForTests()` runs in `beforeEach`: the provider records configure/logIn state
in module scope (`../functions/sdkIdentity.ts`) precisely so it survives remounts, which means
it also survives from one test to the next unless reset.

`deferred<T>()` returns a promise plus its `resolve`/`reject`. Because configure now carries
the identity, first launch has no pre-identity window at all — every unresolved-identity case
is built from an **account switch** whose `logIn` is held pending by a deferred.

`afterEach` unmounts, which runs the effect cleanup and clears the 15s init timeout the
deferred cases leave pending. Without it Jest reports open handles.

## Fixtures

No shared builders apply here — RevenueCat's `CustomerInfo` is a third-party shape, not one of
ours. Two local constants stand in:

- `PREMIUM_INFO` — the minimum `CustomerInfo` that satisfies `hasActiveEntitlement`, keyed off
  the real `ENTITLEMENT_ID` import rather than a copied string, so a renamed entitlement breaks
  the test instead of silently passing.
- `A_PACKAGE` — an identifier-only `PurchasesPackage`; nothing under test reads any other field.

## Non-obvious cases

- **"configures RevenueCat with the authenticated user and never logs in on first launch"**
  pins the root-cause fix: identity travels inside `configure({ apiKey, appUserID })`, so an
  anonymous customer record is never created and there is nothing for a first-launch purchase
  to land on by mistake.
- **"never reaches the store while the app user id is unresolved"** asserts a *refusal*: the
  purchase wrapper's `ensureBillingIdentity` rejects with `'identity-pending'` while a switch
  `logIn` is in flight, and `Purchases.purchasePackage` is never called. This case was written
  red before the guard existed; it is the reason the guard exists.
- **"fetches no subscription state for the new user until the switch identity call resolves"**
  asserts *absence* — `getOfferings`/`getCustomerInfo` call counts unchanged. Both would
  succeed if called early; they would just describe the previous customer, which is exactly
  the failure that is invisible at runtime.
- **"un-gates the app shell after the timeout while purchases stay blocked"** pins the two
  halves of the 15s timeout design at once: a RevenueCat outage must open the app, and must
  never open the store.
- **"ignores an identity call that resolves after the user has already changed"** resolves the
  *stale* `logIn` after two user switches. It passes because of the effect's `cancelled` flag;
  it exists because without that flag user-3 would inherit user-2's entitlement. The flag
  protects React state only — the native flip it cannot undo is what the purchase-time guard
  catches (`../functions/__tests__/identityGuard.test.ts`).
- **The two remount cases mount a second `BillingProvider` without calling
  `resetSdkIdentityForTests()`** — deliberately the one place in the file that lets module state
  survive, because that is what a remount is. They cover the `getSdkUserId() === user.id` branch,
  which no re-render can reach (the effect's deps don't change when the user doesn't), and which
  is the branch the module-scoped state was introduced for. Without them, deleting that branch
  loses nothing in Jest while disabling the purchase CTAs in the app every time PowerSyncGuard
  re-closes its gate.
- **`ENTITLEMENT_ID` is imported, not literal.** `'LiftTrition Pro'` also lives in
  `lib/supabase/functions/_shared/entitlement.ts`; the import is the only one the test can see.

## Known gaps

- **No test asserts the client and the server agree.** The provider's `hasPremium` and
  `hasPremiumEntitlement(userId)` in the Edge Functions answer different questions about
  different records, and nothing in Jest can catch them diverging — that needs a real sandbox
  purchase. The Dev Stats "RevenueCat identity" section is the runtime visibility.
- **The provider-remount amplifier is pinned elsewhere.** Token refresh no longer remounts the
  provider subtree; that guarantee lives in
  `components/GuardComponents/__tests__/PowerSyncGuard.test.tsx`.
- **No billing telemetry exists, by decision.** Identity failures are `console.warn` only;
  production guard-rejection frequency is unmeasurable, so nothing here can pin it.
- **The server-side entitlement path is Deno-tested outside this gate.** Jest ignores
  `lib/supabase/functions/`; its mirror-table/webhook cases run via
  `deno test --allow-env lib/supabase/functions/` and are not part of `npm run test:ci`.
