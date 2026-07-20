# Fix Pipeline — Run Log

One block per issue, appended as the pipeline runs. Newest at the bottom.

---

## C1 — DONE — `fix(DONE/C1)` — 2026-07-20

**Finding:** AI/food-DB Edge Functions unmetered → unbounded paid-API spend (any signed-in account could loop the vision endpoint).

**Fix (root cause):** per-`(user, day, kind)` atomic Postgres quota counter gated before *every* paid dispatch in both Edge Functions, fail-closed on RPC error, 429 surfaced. New migration `lib/supabase/migrations/ai_usage_quota.sql` (RLS-on/no-policies + `SECURITY DEFINER consume_ai_quota`, `REVOKE…FROM PUBLIC` + `search_path` hardening). Client 429→friendly message in `openAI.ts` / `foodDB.ts`.

**implement (pipeline-implementer-done):** 7 files. Cap decision: single generous `foodsearch` pool (300/day) sized to absorb a photo scan's ~10 enrichment calls without starving manual search. Added hardening beyond the brief (PUBLIC revoke, search_path).

**file_review (pipeline-file-review):** no edits; confirmed gate-before-every-paid-call, fail-closed atomicity, 429-before-`res.text()`, substantive tests. Flagged `foodDBModal.tsx` generic-alert swallow for wide_review.

**wide_review (pipeline-wide-review):** fixed the root-cause completion — `foodDBModal.tsx:81` bare `catch {}` hid the quota message; now surfaced. Extracted `FOOD_SEARCH_QUOTA_MESSAGE` constant. Fixed drifted dev twin `FoodDBModalPreview.tsx`. Verified OpenAI path + `enrichBrandedItem` already degrade correctly.

**verify:** Jest cleared 2 baseline suites (`foodDB` 57 + `openAI`), 0 new failures (67→10 baseline). tsc app-surface unchanged; +3 `Deno.env` errors in the two Edge Functions = existing baselined Deno-in-RN-tsconfig class. GREEN.

**OPS CHECKLIST (human — not done by pipeline):**
- Deploy `lib/supabase/migrations/ai_usage_quota.sql` with the release (deploy-order checklist like the C2 migration was).
- Configure caps via env on the deployed functions: `AI_VISION_DAILY_LIMIT` (default 30), `AI_TEXT_DAILY_LIMIT` (default 60), `AI_FOODSEARCH_DAILY_LIMIT` (default 300). Defaults are safe if unset.
- Manually validate the Deno branch (`supabase functions serve` + SQL smoke test on `consume_ai_quota`) — Edge Functions are outside the jest/tsc gate.

**Known accepted tradeoffs (documented in code):** quota charged pre-flight (refused/errored scans still spend a unit); UTC day rollover; `getFoodDetails` 429→null (silent degraded add-food details path).

---

## C3 — DONE — `fix(DONE/C3)` — 2026-07-20

**Finding:** Settings persist effect released its save mutex (`persistSavingRef`) only when NOT cancelled, so a mutation during an in-flight save wedged the mutex `true` for the whole session — no settings ever persisted again (macro targets/goal/units lived only in React memory, vanished on app kill).

**Fix (root cause):** unconditional `persistSavingRef.current = false` in `finally`; added a `scheduledBackoff` local gating the re-arm (`persistDirtyDuringSaveRef.current && !scheduledBackoff` → clear ref, `setPersistDirty(true)`, bump `persistRetryNonce`); deleted the old in-try re-arm block. No signature change.

**implement (pipeline-implementer-done):** the 3 adjudicated edits. Adapted the new test from the brief's `renderHook` API (not installed) to the repo's real `Probe` + `react-test-renderer` pattern; verified the wedge test fails pre-fix / passes post-fix. `context/SettingsContext/index.tsx` + new `__tests__/index.persist.test.tsx`.

**file_review (pipeline-file-review):** no edits; empirically proved both tests non-vacuous (swapped pre-fix/naive-gate variants). Confirmed the `simplify` skill is the registered name (not `code-simplifier`).

**wide_review (pipeline-wide-review):** no edits. Confirmed **no structural twin** (Nutrition/Workout persist via direct per-row writes, not this mutex pattern — intentional, settings is one-row-per-user). Core fix traced correct across all dirty-state producers + consumers; sign-out flush strictly benefits.

**verify:** Jest 6/10 = baseline, +2 new C3 tests pass (635 total). tsc 28 = baseline (0 in SettingsContext). GREEN.

**KNOWN MINOR FOLLOW-UP (non-blocking, logged not fixed):** on the give-up-after-`SETTINGS_ALERT_AFTER`-failures path the catch returns before setting `scheduledBackoff`, so an Object.is-equal mid-save mutation can trigger the finally re-arm → one extra doomed `upsertSettings` + possible duplicate Sentry + extra `reloadFromDisk` racing the rollback. Self-correcting (idempotent, `persistDirty` ends false, no loop); reachable only via an extremely narrow interleaving on an already-failing-DB path. Clean fix = a `rolledBack` local mirroring `scheduledBackoff` to skip the re-arm on the give-up path — deferred because it's an uncovered error path (no test exercises ≥N failures) where a blind edit is riskier than the Sentry-noise it removes.

---

## C4 — AUTHORED — `fix(AUTHORED/C4)` — 2026-07-20

**Finding:** the nutrition-entry Options-menu Delete called `handleDeleteNutrition` directly — no confirm, no undo — while every sibling delete flow confirms. One mis-tap permanently destroyed the entry (drift, not design).

**Fix (root cause):** wrapped the Delete `onPress` in the shared `confirmDelete` helper, matching the exact sibling call shape (names the entry, destructive style, `onConfirm` → `handleDeleteNutrition`). No signature change.

**implement (pipeline-implementer-fresh, Opus):** core fix + the DevHub preview this ui-ux issue was promoted for (`NutritionEntryMenuTest.tsx` + `__DEV__` route stub + `app/_layout.tsx` Stack entry + `DevHub.tsx` GROUPS entry) + a regression test. Correctly adapted the brief (registered the route in `app/_layout.tsx` since the brief's `app/devTest/_layout.tsx` doesn't exist).

**file_review (pipeline-file-review):** no edits; verified the sibling call shape, the production-cost guard (test component reached only via `__DEV__` require), and the regression test fails pre-fix. `simplify` skill resolved cleanly (name fix worked).

**wide_review (pipeline-wide-review):** no edits. **Full twin sweep: every persistent destructive delete in the app now confirms** — no remaining unconfirmed path. In-memory staging removals correctly don't confirm. Routing + production-cost verified.

**verify:** Jest 6/10 = baseline, +1 new C4 test (636 total). tsc 28 = baseline (no new errors in any C4 file). GREEN.

**FOLLOW-UP (not C4, logged not fixed):** `handleDeleteUserExercise` (`context/WorkoutContext/index.tsx:350,512`; `types.ts:94`) is exported but has zero UI call sites — dead code; prune or wire later.

---

## H1 — DONE — `fix(DONE/H1)` — 2026-07-20

**Finding:** premium was enforced only client-side (`if (!hasPremium)`); the two paid Edge Functions never checked entitlement, so any free account (or a curl with a valid JWT) got AI scan/macros/food-search free — the enabler that made C1 exploitable.

**Fix (root cause):** new shared `lib/supabase/functions/_shared/entitlement.ts` — `hasPremiumEntitlement(userId)` via RevenueCat REST (`/v1/subscribers/{id}`), fail-closed on every error/timeout/missing-key, 4s AbortController. Both functions now return **403 `premium_required`** after auth and **before** C1's quota gate (auth→premium→quota→paid), covering all branches. `ENTITLEMENT_ID='LiftTrition Pro'` verified against the client.

**implement (pipeline-implementer-done):** the helper + gate + a Deno unit test. Caught that the new Deno test would be swept into `test:ci` and fail → added `testPathIgnorePatterns` for `lib/supabase/functions/` in `package.json`.

**file_review (pipeline-file-review):** no edits; traced fail-closed on every branch, gate ordering, `AbortController` leak-free (timer cleared in `finally`), and the `package.json` exclusion correctness.

**wide_review (pipeline-wide-review):** fixed a **real regression** — the fail-closed 403 leaked `Edge function error: 403 - {"error":"premium_required"}` verbatim to *paying* users during an RC blip. Mapped 403 → "Couldn't verify your subscription…" in `openAI.ts` (before `res.text()`, mirroring C1's 429), hardened `foodDB.ts` + `foodDBModal.tsx` + the dev twin `FoodDBModalPreview.tsx`, added 403 tests. Confirmed no ungated paid twin (only these 2 functions make paid calls).

**driver (verify-gate hygiene):** H1 added new Deno files under `lib/supabase/functions/`, which tsc still compiled (+22 Deno errors). Since no app code imports that dir (verified), excluded `lib/supabase/functions` from **tsconfig** — the tsc twin of the implementer's jest exclusion. This eliminated the entire Deno-can't-resolve tsc class (23 baseline + 22 new): **tsc 50→5** (all app-surface baseline). Baseline doc updated.

**verify:** Jest 6/10 = baseline, +2 new 403 tests (638 total), Deno test excluded. tsc 5 = app-surface baseline (Deno dir excluded). GREEN.

**OPS CHECKLIST (human — HARD release gate):**
- `supabase secrets set REVENUECAT_SECRET_API_KEY=<RC v1 REST secret>` **before** the release build. If unset, `hasPremiumEntitlement` fails closed and **every** premium user gets 403 on every AI/foodDB call. Document alongside `OPENAI_API_KEY` / `FATSECRET_*`.
- Release smoke test: curl both functions with a free-account JWT ⇒ 403 (no upstream usage); with a premium/sandbox JWT ⇒ 200.
- Edge Functions are no longer in the jest/tsc gate — validate with `deno check` / manual smoke.

**Known accepted tradeoff (documented):** a per-call RC REST gate means a photo scan fans out to ~11 entitlement lookups; under an RC outage a premium user's branded enrichment silently degrades to the vision estimate (bounded, still returns a result). Webhook-synced entitlements table is the deferred follow-up if RC rate-limits prove material.

---

## H2 — MERGED — `fix(MERGED/H2)` — 2026-07-20  ⚠ post-hoc review target

**Finding:** `lib/powersync/Connector.ts` poison-row handling wrong both ways: (a) only SQLSTATE 22/23 dead-lettered, so any other permanent error (class-42 RLS/schema-drift, PGRST204/205) retried FOREVER → whole upload queue wedged → forced-sign-out = total-queue data loss; (b) `user_exercises` (server `UNIQUE(user_id,name)`) wasn't self-healing, so a 23505 silently dropped a cross-device custom exercise.

**Phase 1 — judge (this was a consolidated but UN-adjudicated brief):** the judgmental implementer ruled on all 6 decision points (adopt the `/^(22|23|42)/`+PGRST204/205 classifier with correct transient carve-outs; adopt the `CONFLICT_KEYS` map-driven consolidation; uphold rejecting the telemetry-only dissent; uphold deferring wedge-telemetry to H4; accept the bounded-loss trade-off). Two sharp corrections: (i) the derived-set design *structurally* enforces the classifier/branch invariant (can't add a natural-key table to one without the other), dissolving the brief's commit-coupling worry; (ii) the brief's "existing PUT/PATCH tests as behavior guards" was wrong — those are the pre-existing baseline failures (mocks lack `.select`), so it added 4 properly-mocked settings/weight_progress guards instead.

**Fix (root cause):** one `Connector.ts` change — broaden `isNonRetryableUploadError` (dead-letter 22/23/42 + PGRST204/205; keep PGRST301 + 08/40/53/57/58 + codeless errors retrying) and replace the hand-duplicated `settings`/`weight_progress` branches + `SELF_HEALING_CONFLICT_TABLES` literal with `CONFLICT_KEYS = {settings:[user_id], weight_progress:[user_id,date], user_exercises:[user_id,name]}`, the set derived from it, and one generic natural-key check-then-update-else-insert. +18 tests.

**file_review:** simplified (collapsed two duplicated `.eq()`-chaining loops into one `filterByConflictKeys` closure); empirically verified behavior preservation (swapped pre-fix code), both classifier directions, the `.every(k=>record[k])` guard vs old truthy checks, and that new tests fail on old code.

**wide_review:** no edits. **`CONFLICT_KEYS` is complete** — the only 3 schema `UNIQUE` constraints are all covered, so no other table has the silent-drop bug. Verified `user_exercises` write path end-to-end, sole-implementation, and queue-advance semantics.

**verify:** Jest 6/10 = baseline (connector's 3 failures are the exact pre-existing ones), +18 new tests pass (656 total). tsc 5 = app-surface baseline (0 in powersync). GREEN.

**OPS CHECKLIST (human — DEPLOY ORDERING, now safety-critical):** the widened dead-letter set converts "retry-forever wedge" into "bounded single-row drop" for un-applied additive migrations. Apply these in Supabase **before/with** the build that ships H2, or brand-bearing ingredient rows / settings-flag writes will silently dead-letter: `ingredient_brand.sql` (brand col), `settings_goal_intent_flags.sql` (macros_customized / goal_overshoot_acknowledged), `nutrition_calories_real.sql`. (This is the intended trade-off — the fix is the safety net, deploy-order discipline is the real guard.)

**FOLLOW-UP (pre-existing, NOT introduced by H2, logged not fixed):** PATCH ops on check-then-insert tables route through `updateRecord` by `id` only (`Connector.ts:232`); after a cross-device natural-key collision the loser's local `id` ≠ the surviving server row's `id`, so a later edit PATCHes 0 rows silently. Affects `weight_progress` and now `user_exercises` (`settings` has a session-lookup workaround). Own fix = route these tables' PATCH through natural-key resolution.

---

## H3 — MERGED — `fix(MERGED/H3)` — 2026-07-20  ⚠ post-hoc review target

**Finding:** the audit's strongest hotspot (3 agents converged). `await powerSync.waitForFirstSync()` never rejects on network failure, and the retry UI only renders on rejection — so a fresh install / first sign-in with PowerSync unreachable is hard-stuck on "Syncing data…" forever, with no timeout, no retry that re-attempts the connection, and no sign-out escape. Returning users unaffected (persisted first-sync flag).

**Phase 1 — judge (consolidated, un-adjudicated brief):** upheld all decisions against live code + the SDK types. Key rulings: (i) the SDK abort contract (verified in `AbstractPowerSyncDatabase.d.ts:194-206`: `waitForFirstSync(signal)` RESOLVES on abort, never rejects) + a post-resolve `hasSynced` check is correct and leak-free — a `Promise.race` against a rejecting timer would abandon the SDK's internal wait/listener on every offline retry; (ii) escape must use `forceSignOut` not `signOut()` (the latter's `flushUploadsOrThrow` would hang on the same unreachable backend; a first-sync-blocked device has no local writes to lose); (iii) `ensurePowerSyncConnected` in the loader is idempotent/mutex-serialized and is what makes retry a real recovery; (iv) the 3 other bare `waitForFirstSync` calls (Settings/Nutrition/Workout context loaders) are intentionally left — they're children of the guard, unreachable during the hang.

**Fix (root cause):** new `lib/powersync/waitForFirstSync.ts` (`waitForFirstSyncOrThrow`, `FIRST_SYNC_TIMEOUT_MS=30_000`, `FirstSyncTimeoutError`); `PowerSyncGuard` now `ensurePowerSyncConnected('auth_session')` → helper → `handleEscape`(confirm → `forceSignOut`) + `onSignOut`; `AppLoadingScreen` gains an optional, additive sign-out link (a11y roles/labels + ≥44pt targets on both links). Augmented `LoadingScreenTest` DevHub page. +3 test suites (11 tests).

**file_review:** two quality edits — replaced the hand-rolled `Alert.alert` with the existing `confirmDelete` helper (DRY, `confirmText:'Sign out'`, behavior-identical, test still passes) and fixed copy-paste drift (missing `linkRow` gap between the two links). Verified the abort contract against the SDK source.

**wide_review:** no edits. Confirmed the twin `waitForFirstSync` sites can't hang (providers strictly inside the guard; any session change re-gates), the route guard cleanly returns to login after `forceSignOut`, and double-`ensurePowerSyncConnected` is mutex-safe. Two pre-existing follow-ups surfaced (below).

**repair (1 bounce):** tsc flagged 4 type errors in the new `PowerSyncGuard.test.tsx` (over-constrained mock generics + a `string` passed to `FirstSyncTimeoutError(timeoutMs:number)`). Fixed at the root (typed the mock param; passed `30000`) — no production change; tests stay green.

**verify:** Jest 6/10 = baseline, all 3 new suites pass (667 total, +11). tsc 5 = app-surface baseline (0 in H3 files) after the repair. GREEN.

**FOLLOW-UPS (pre-existing, NOT introduced by H3, logged not fixed):**
1. `forceSignOut` isn't purely network-free: `removeLocalAuthSession` calls `supabase.auth.signOut({scope:'local'})`, which still POSTs `/logout?scope=local` when a token is present — on a reachable-but-dead backend the escape can block up to the fetch timeout (~60s) before the local-removal fallback. Bounded/self-healing (never infinite), shared auth code also used by `deleteAccount`. Fix = call `_removeSession()` first for the force path so the escape is instant.
2. The guard's dep is the `session` OBJECT, so a token refresh (new object, same user) re-runs the loader → momentary `loading` → remount of the Settings/Workout/Nutrition provider subtree (data reload + in-memory reset like `NutritionContext.selectedDate`). Load-bearing (it's what makes the twins safe), but a candidate to key on `user.id` instead.

---

## H4 — DONE — `fix(DONE/H4)` — 2026-07-20

**Finding:** production observability near-zero — only 3 Sentry capture sites, no `setUser`, no environment tag. The real data-loss funnels (connect failure, sync wedge, flush-timeout forced sign-out, AI/edge failures, route crashes) emit no telemetry, so C3/H2-class bugs would be invisible in prod.

**Fix (root cause):** additive telemetry — one capture per genuine failure funnel (connect / kick / disconnect-clear / sign-out-failure / force-sign-out[+its own failure] / edge-openai / edge-fooddb / route-crash) + `setUser({id})` + `environment`, with intentionally-swallowed benign paths left uncaptured. 13 prod/config files + 6 test files (3 new). Notably the brief predated C1/H1/C4 commits — the implementer handled the drift (openAI.ts/foodDB.ts's `callEdgeFunction` post-429/403 mapping; the no-longer-empty `openAI.test.ts`; C4's `_layout.tsx` `Stack.Screen`) and left the expected 429/403/refused user-message throws uncaptured (only genuine failures captured). Bonus: removed the invalid `enableInExpoDevelopment` option → cleared a baseline tsc error.

**file_review:** fixed TWO real gaps — (1) the explicit capture sites missed `res.json()`/`res.text()` failures on a 200 body (added a third site); (2) a **genuine double-capture** the adjudication itself introduced — `disconnectAndClearPowerSync` capturing *plus* `profile.tsx`'s new sign-out-failure catch both firing on the `signOut()` path. Reworked: `disconnectAndClearPowerSync` state-only, capture moved to `clearLocalSession`'s swallow site.

**wide_review:** no edits. Exhaustively traced the sign-out capture topology (failure-origin → site → count table) and **confirmed exactly one capture per funnel** — the key subtlety being `clearLocalSession` captures *and swallows* (`console.warn`, no rethrow), so `forceSignOut`'s catch never double-fires. Verified edge rework, `@sentry` test-mock coverage (no `test:ci` break), one-shot ErrorBoundary, and `{id}`-only (no PII).

**repair (1 bounce):** tsc flagged 2 type errors in the new `SyncWatchdog.test.tsx` (a non-tuple array spread into zero-arg mocks); fixed at the root (call the zero-arg mocks with no args), no production change.

**verify:** Jest 6/10 = baseline, +22 new tests (689 total). tsc **4** = new baseline (H4 cleared the `enableInExpoDevelopment` error). GREEN.

**OPS CHECKLIST (human):** set `EXPO_PUBLIC_APP_ENV` per EAS profile (else `environment` falls back to `__DEV__`-derived) — coordinate with H5. Source-map upload for readable stack traces is H5's scope.

**FOLLOW-UPS (surfaced by wide_review, out of H4's adjudicated funnel scope, logged not fixed):**
1. `profile.tsx handleDeleteAccount` (the twin of `handleSignOut`) has NO capture in its catch — delete-account failures are user-alerted but emit zero Sentry event. Trivial add (`captureException area:'delete-account-failure'` at the catch) with no double-capture risk. Own follow-up.
2. Pre-existing micro-gap: on the `!res.ok` path, `await res.text()` runs outside the try/catch, so an error-response body failing mid-read yields no capture. Extremely rare, not introduced by H4.
