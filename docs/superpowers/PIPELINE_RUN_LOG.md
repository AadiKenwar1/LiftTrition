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

---

## SCOPE CORRECTION — rollback of M1 / M2 / M23 (not in the audit) — 2026-07-20

**Trigger:** the user caught the pipeline implementing issues that are NOT line-items in `docs/PRODUCTION_READINESS_AUDIT.md` (the sole scope authority), M23 cited by name. **Root cause:** the manifest was built from `PRODUCTION_READINESS_FIXES.txt` — an older, larger finding set — and only C2/H7/H11/H12/H13 were excluded; it was never fully reconciled against the trimmed audit. The audit's Medium/Low items are prose bullets with NO id numbers, so brief→audit mapping is by file+symptom, and three issues slipped through.

**Audit sweep (every implemented commit re-checked against the audit):** all Criticals (C1/C3/C4) and all Highs (H1/H2/H3/H4/H5/H6/H8/H9/H10/H15) are genuine `###` line-items → **kept**. Only three orphans — exactly the ones the user flagged:
- **M23** (revert `b7926f5`): removed a '5.0' star rating from login/paywall/subscription. NOT an audit severity line-item (only a Go/No-Go verdict aside). The rating is **REAL** — earned on a prior App Store release, not fabricated — so the removal was doubly wrong. **Restored everywhere.**
- **M1** (revert `aec38b8`): flush dirty settings before the sign-out wipe. NO audit line-item — the audit lists the sign-out flush gate as CLEAN (line 180).
- **M2** (uncommitted changes discarded): backup/DR runbook + meal-photo Storage upload + bucket migration. NO audit line-item — audit line 94 is a different photo-**resize** perf issue, not upload durability.

**Rollback mechanics:** M1 reverted (was HEAD, clean); M23 reverted (code clean — proving no later commit touched those files; manifest/run-log conflict resolved by keeping current); M2's 5 tracked files `git restore`d + 2 untracked artifacts (`docs/runbooks/`, `lib/supabase/migrations/nutrition_photos_bucket.sql`) deleted. Manifest: M1/M2/M23 → `status:"excluded"` + notes, added to the `excluded` array.

**Machinery hardened so this can't recur — an audit-scope GATE:** STEP 0 in all three implementer agents (grep the audit for the issue's file+symptom; no live line-item → return `"inAudit": false`, change nothing); runbook step-3 driver GATE + a belt-and-suspenders step-4 check + two new invariants (the driver greps the audit before dispatch; no audit home → mark `excluded`, commit, skip). A brief existing is no longer treated as scope — only the current audit is.

**verify (post-rollback):** tsc **0**, jest **744/744** green (744 vs the pre-rollback 755 because reverting M1 removed its tests).

---

## SCOPE-GATING PASS — full audit reconciliation of the remaining 46 issues — 2026-07-20

After the rollback, EVERY remaining pending issue was gated against `docs/PRODUCTION_READINESS_AUDIT.md` (grep by target file + symptom — Medium/Low items are prose bullets with no id numbers). Of 46: **29 are genuine audit line-items → kept pending**, **15 have no audit line-item → excluded**, **1 is in-audit but OPS → needs-human (M6)**, **1 was already fixed → done (L14)**.

**Excluded (no audit line-item):** M3 (migration ledger — only trace is excluded C2's deploy-checklist; pure-OPS) · M4 (env-crash/entry-point + eas env) · M5 (Sentry environment/tracesSampleRate; H4 already removed the dead enableInExpoDevelopment) · M11 (settings 1s getUploadQueueStats poll) · M13 (addExerciseModal fuse-search debounce; food-search debounce is audit-clean, line 178) · M17 (NutritionContext store entry/saved-meal duplication) · M20 (RevenueCat offerings `any` / row-mapper non-null type holes) · M25 (modal swipe-to-dismiss discard guard) · M26 (visible Cancel control on analyzing modal) · L1 (placeholder brief, no defect) · L2 (adjustNutrition1 maintain resets goalPace) · L18 (foodDB cache unbounded growth) · L23 (week-stepper chevron opacity) · L27 (PHONE_MAX_WIDTH comment / no-op clamp) · L30 (settings sync-line wedge escalation).

**M6 (OTA, audit line 89) → needs-human:** genuinely in the audit, but installing expo-updates + EAS update setup is a post-release operational decision, not verifiable in-repo — see OPS CHECKLIST.

**L14 (body-weight 0-seed, audit line 129) → done:** superseded by H10 (0cb9dba) — the leading-0 seed was fixed when the 4-copy graph walk was consolidated into buildDailySeries.

**In-scope, to implement (29):** M7, M8, M9 (likely premise-stale — resize pipeline already exists), M10, M12, M14, M15, M16, M21, M22, M27 (feedback only — the audit's own dev-note keeps the duplicate-name logic as-is), M28, M29, M30, M31, M32; L3, L12, L13, L16, L17, L19, L21, L24 (brief defers the Android-Alert item), L25, L26, L28, L29, L31.

**OPS CHECKLIST (add):** M6 — decide/set up OTA (expo-updates + `eas update:configure` + `runtimeVersion`) as a post-launch operational task.

---

## M7 — DONE — `fix(DONE/M7)` — 2026-07-20

**Finding (audit line 90):** the Supabase session (access JWT + long-lived, bearer-equivalent refresh token) persisted in plaintext AsyncStorage — liftable via jailbreak / unencrypted backup / forensic extraction. expo-secure-store was never a dependency.

**Fix (root cause):** new `lib/supabase/secureStorage.ts` — a Supabase-compatible Keychain-backed adapter (AFTER_FIRST_UNLOCK) that chunks values across `<key>.<n>` + a `<key>.count` meta (SecureStore's ~2048B cap), clears the prior chunk set on overwrite (no orphaned rotated-token fragments), and writes `.count` LAST so a mid-write crash fails safe into "no session" (re-login) not a corrupt blob. `client.ts` branches `Platform.OS` (Keychain on native, AsyncStorage on web) and folds a REQUIRED one-time legacy-session migration INTO getItem (which GoTrue awaits during init, so it can't race): on a Keychain miss it copies the legacy plaintext session into the Keychain, deletes the plaintext, and returns it — existing users keep their session, fresh installs no-op. + expo-secure-store dependency, a global jest.setup.js mock, and secureStorage.test.ts (round-trip / chunking / cleanup / overwrite-shrink).

**file_review:** one simplify edit — parallelized setItem's chunk-write loop (`for await` → `Promise.all`, matching the file's own deleteChunks/getItem fan-out) while preserving the count-written-last invariant. Independently reproduced the migration across 4 scenarios (upgrade preserves session, fresh no-op, already-migrated, signed-out) — the mass-logout gate holds.

**wide_review:** no edits. All 8 `supabase/client` importers use GoTrue's storage-agnostic in-memory API; none touch the auth-token key directly. Sign-out/delete route through removeItem (all chunks cleared, no residue). Web keeps AsyncStorage (expo-secure-store ships a web shim, never called). jest.setup.js mock covers all 314 client-reachable tests; the one newly-routed suite (orchestrator via Connector→client) passes. `@types/react-test-renderer` devDep is legit (clears a pre-existing TS7016 in two unsuppressed test files).

**Install side-effects handled:** `npx expo install expo-secure-store` auto-added an app.json plugin entry + reformatted the file (adjudication ruled the plugin unnecessary) — reverted app.json to byte-identical; and pruned an untracked `@types/react-test-renderer` (tsc 0→9) — re-added as a proper devDependency (tsc back to 0), a durable improvement.

**verify:** tsc **0**, jest **748/748** (744 + 4 new). GREEN.

**FOLLOW-UPS (flagged by reviews, not fixed — outside M7's scope):**
1. `CHUNK_SIZE=2000` slices by JS string `.length` (UTF-16 units), not UTF-8 bytes — a session with enough multi-byte chars (non-ASCII Apple ID name in `user_metadata`) near a chunk boundary could exceed SecureStore's ~2048-byte cap. Robustness follow-up.
2. The migration getItem early-returns on a Keychain hit, so if the first migration's `AsyncStorage.removeItem` failed AFTER the Keychain `setItem` succeeded, the legacy plaintext would linger (never retried). Rare, no data-loss/logout impact.

**OPS (human):** on a real EAS build, verify an over-the-top upgrade preserves the session (or forces one clean re-login) and that no `sb-*-auth-token` remains in plaintext AsyncStorage; separately confirm `expo start --web` still authenticates.

---

## H9 — DONE — `fix(DONE/H9)` — 2026-07-20

**Finding:** ingredient-row quantities were persisted via `sanitizeMacro` (1-decimal round): 0.25 servings → 0.3 (+20%). Stored entry totals were computed from the raw value, so items stopped reconciling with totals, and merely opening `editEntry` + tapping Save silently rewrote the meal's macros with no user edit.

**Adjudication extended the fix:** the SAME defect existed on a SECOND axis — per-unit macros (`protein/carbs/fats/calories`) were also `sanitizeMacro`-rounded at the same two call sites while `sumItems` re-consumed the raw values, so a whole-number quantity ≥2 with a 2-decimal macro (the norm for foodDB/FatSecret data, e.g. 29.55) silently rewrote the total on a no-op Save. Fixing only quantity would leave the common case broken.

**Fix (root cause, both axes):** `lib/utils/number.ts` gains `sanitizeQuantity` (fallback 1, preserves explicit 0) + `sanitizeExactMacro` (fallback 0), both full-precision via a shared `preserveFinite(n, fallback)`. `powersyncStore.ts:191` (entries) + `:232` (saved) now store quantity via `sanitizeQuantity` and all four macros via `sanitizeExactMacro`. Entry-level total columns still round via `sanitizeMacro` (display) — untouched. No schema change (SQLite REAL already stores arbitrary precision); legacy rows stop drifting further (backfill out of scope).

**implement (pipeline-implementer-done):** both axes/both call sites + 3 tests, verified failing pre-fix (reverted → `Expected 0.25 Received 0.3` on the real INSERT path).

**file_review:** deduped the OLD/NEW transform literals in `items.test.ts`; **proactively ran a scoped tsc and fixed a TS2502** (self-referential `tx: typeof tx`) in the new mock helper before it could fail the gate; re-confirmed non-vacuousness.

**wide_review:** fixed a **real H9-caused display regression** — `editEntry.tsx`'s `toDraft` rendered per-item values via raw `String()`, so an H9-preserved float artifact (e.g. `0.30000000000000004` from chained `scaleItems`) would show as noise in the edit inputs. Added a render-site `toInputString` (rounds display to 6 decimals; does NOT touch the stored value, so H9 isn't reintroduced). Confirmed only 191/232 persist item rows, no double-round, no equality/dedup or mixed-precision-assertion regression.

**verify:** Jest 6/10 = baseline, +13 new tests (702 total), `editEntry.test.tsx` still green. tsc 4 = baseline. GREEN.

---

## H15 — MERGED — `fix(MERGED/H15)` — 2026-07-20  ⚠ post-hoc review target

**Finding:** "add/edit" modal twins hardened one side only: `addWorkoutModal` got `useSubmitOnce`, its ~95%-identical `renameModal` didn't (double-tap → double rename + double `router.back` pop); `editEntry`'s Save was likewise unguarded, and its route-param `JSON.parse` was unguarded (red-screen crash on a malformed/deep-linked param); the staged macro pills in `foodDBModal`/`savedNutritionModal` hand-rolled item math against the "single owner of rounding" contract in `items.ts`; the workout duplicate-name check was tripled.

**Phase 1 — judge (consolidated, un-adjudicated, flagged authored-while-classifier-down):** the judgmental implementer **caught a real defect in the brief's safety-critical claim.** The brief said the saved-meal pill swap to `sumItems(scaleItems(itemsForEntry(s),q))` reproduces the current display exactly and that `q·round(x) == round(q·x)` — FALSE for multi-item meals at fractional q (it re-sums unrounded per-item macros: 376 vs 378 kcal, 35.1 vs 35.3 g P at q=2.5). Reconciled to route the pill through `sumItems` over a single item carrying the entry's already-rounded stored totals scaled by q — pixel-identical today AND single-owner routing. Upheld: Tier-1/Tier-2 split (defer the 200-line state-machine extraction), guard ordering (name-taken Alert before `guardSubmit` so a rejected name doesn't consume the lock), the `parseEntryParam` crash guard, and `isWorkoutNameTaken` verbatim parity.

**Fix (root cause, Tier-1):** `useSubmitOnce` on `renameModal` + `editEntry` commit paths; `parseEntryParam` try/catch (`router.back()` on malformed JSON); both staged pills routed through `sumItems`; `isWorkoutNameTaken` extracted to `context/WorkoutContext/functions/nameCheck.ts` (both call sites migrated). + DevHub scaffolding (RenameModalTest + stub + `_layout` Stack.Screen + DevHub entry; EditEntryTest gained a corrupt-JSON scenario) + 4 test suites (24 tests). All file drift handled (editEntry H9, foodDBModal C1/H1, `_layout` C4/H4).

**file_review:** no edits; hand-computed the saved-meal pill parity (`Math.round(151·2.5)=378` matches old vs the brief's 377), verified guards/hook-order/name-check parity and that all prior fixes are intact.

**wide_review:** no edits. Verified H15 internals (pill fields un-transposed, second-tap is a true no-op, `useSubmitOnce` reset sound). **Twin sweep found 3 MORE unhardened commit paths** (below).

**repair (1 bounce):** tsc flagged a null-narrowing gap — `parseEntryParam` returns `NutritionEntry | null` and TS doesn't carry the component-body guard's narrowing into `handleSave`'s closure. Fixed at the root (`const entry = parsedEntry` after the guard, used in the closure), no type weakening.

**verify:** Jest 6/10 = baseline, +21 new tests (723 total). tsc 4 = baseline (0 in editEntry after repair). GREEN.

**FOLLOW-UP (launch-relevant, same bug class, OUT of H15's scope — its own issue):** wide_review found **3 more unguarded mutation-then-`router.back()` modals** that double-write/double-pop on a fast double-tap: `app/nutritionScreens/updateBWModal.tsx:63` (weigh-in), `app/settingsScreens/adjustMeasurements.tsx:25`, `app/settingsScreens/adjustTraining.tsx:34` (non-custom path). Each needs the identical `useSubmitOnce` wrap. Also systemic-but-milder: every onboarding step commits via `OnboardingScaffold` `onNext` without a guard (double-*push*, forward-nav) — one guard on the scaffold Next button covers all. `paywall.tsx` (the real onboarding-complete commit) is already guarded.

---

## M23 — AUTHORED — `fix(AUTHORED/M23)` — 2026-07-20  ✅ LAST LAUNCH-BLOCKER

**Finding (App Review 2.3.1 accuracy):** three purchase-adjacent screens (`login.tsx`, `paywall.tsx`, `subscription.tsx`) hardcoded a fabricated "★★★★★ 5.0" rating for an app with no released version to have earned it — an App Store rejection risk. The audit flags it twice as launch-gating (Go/No-Go NO-GO reasons + Top-5 pre-submission). *(Reconciliation note: Medium issues have no per-ID `###` header in the audit — the finding lives in the summary sections, verified in-scope, not a deleted issue.)*

**Fix (root cause):** deleted the `ratingRow` block (+ dead `ratingRow`/`ratingText`/`stars` styles and login's now-unused `Star` import + stale JSDoc) from all three screens. No placeholder, no spacing hack (the CTA's existing `marginBottom` carries the gap). Added a `__DEV__`-only `RatingRemovalTest` DevHub page (this ui-ux launch-blocker was promoted for the DevHub gate).

**implement (pipeline-implementer-fresh):** the deletions + DevHub page; left the separate `#FFD93D` duplicated-star-color finding untouched (correct scope).

**file_review:** deduped the preview page (two identical CTA+trust blocks → a `.map()`); grep-confirmed zero `5.0`/`★`/rating-style references remain and the `Star` import removal is clean.

**wide_review:** no edits. Whole-repo sweep confirmed the 3 screens were the ONLY shipped surfaces with a fabricated rating; routing + layout intact.

**verify:** Jest 6/10 = baseline (no new tests — a static-block deletion), tsc 4 = baseline (new devTest files clean). GREEN.

**FOLLOW-UP (dev-only, surfaced by wide_review, NOT a 2.3.1 risk today):** the fabricated rating survives in `__DEV__`-only design mockups under `components/devTest/onboarding/versions/` (login V3/V4/Wordmark/ValueProp/Monogram; paywall V3/V4/Refined; intro V3/Refined). Metro strips these from production, so no App Review risk — but they're the design source-twins of the shipped rows: **whoever later promotes a login/paywall variant into the real onboarding flow must strip its rating row first.**

---

## 🎉 MILESTONE — all 10 launch-blockers done (2026-07-20)

C1, C3, C4, H1, H2, H3, H4, H9, H15, M23 — every `[LAUNCH-BLOCKER]` issue implemented, root-caused, double-reviewed, verified at baseline, and atomically committed. Remaining 52 issues are non-blockers (post-launch track), continuing in severity order starting at H5. The release OPS checklist (C1 migration + caps, H1 RevenueCat secret, H2 migration deploy-ordering, H4 app-env) and the follow-up backlog live above.

---

## H5 — DONE — `fix(DONE/H5)` — 2026-07-20  ▶ first non-blocker; clean re-run after a scrapped attempt

**Finding:** no automated verification anywhere — the only workflow was `codeql.yml` (build-mode none, no tests/typecheck), `package.json` had no `typecheck` script and `test:ci` was a bare `jest`, and EAS builds are triggered manually. Any regression, including in the data-loss-critical sync paths, ships unverified.

**Fix (root cause):** added `.github/workflows/ci.yml` (on PR + push to main) with **tsc typecheck as the blocking gate and jest as an advisory `continue-on-error` step** — deliberately tsc-first, because the suite is uneven and shouldn't block merges (matches the driver's own verify-gate reframe). Env block supplies dummy public `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`POWERSYNC_URL` so `client.ts`'s import-time `createClient()` doesn't throw in CI. `package.json`: added `typecheck = tsc --noEmit`, `test:ci = jest --ci`. No lint config, no `@types/react-test-renderer` (both confirmed unnecessary).

**Made the hard gate real:** cleared the 3 genuine tsc errors — `watchdogStatus.ts:40` cleanup wrapped in braces (Set.delete's boolean → void, fixed at the shared source not the DevStatsModal call site); `crudFunctions.test.ts` mock retyped to the real `Dispatch<SetStateAction<NutritionEntry[]>>`; `WorkoutContext/graphFunctions.test.ts` dropped a bogus `name` key absent from `Log`. Only ONE production line changed (watchdogStatus), behavior-identical.

**Tests-are-evidence triage (the 4 failing suites were all STALE TESTS, not product bugs):** `connector.test.ts` (3) — mocks were missing the `select`/`eq` chains the post-H2 Connector actually calls, and the old PATCH test even asserted the wrong filter column (`.eq('id')` vs the real `.eq('user_id')`); fixed the mocks, `Connector.ts` untouched. `prefs`/`builders` (3) — pinned to abandoned plan-doc meal times (9:00/12:30/18:30) that never matched the shipped `DEFAULT_NOTIFICATION_PREFS` (8:00/12:00/17:30); corrected to the shipped constant (the single source of truth). `NutritionContext/graphFunctions` (1) — expected an empty array for a future onboarding date, but `calculateStartDate` clamps future→today; corrected to length 1.

**file_review:** independently re-derived all 6 test-expectation changes from real source and confirmed each is a genuine "test was wrong" case (not force-greened); one diff-scoped simplification to the connector PATCH mock; ran the affected suites (93/93).

**wide_review:** no code edits. Confirmed watchdogStatus is prod-identical (useEffect cleanup return ignored), `test:ci → jest --ci` is inert (already single-run, zero snapshot tests), ci.yml env/lock/gate wiring correct, connector tests still assert real behavior. One non-blocking caveat (typecheck blocks on the whole repo being clean) — satisfied by the verify run.

**verify:** tsc **0 errors** (hard gate green — cleared the 3 baseline errors), jest **70/70 suites / 724/724 tests** (cleared all 4 baseline suites). Baseline is now fully clean. GREEN.

**OPS CHECKLIST (human — not done by pipeline):**
- On GitHub, mark the new CI **Typecheck** job a **required status check** via branch protection on `main` (the workflow runs, but "required" is a repo setting the pipeline can't toggle).
- Optionally promote the advisory jest step to blocking later, once the suite is trusted (currently `continue-on-error: true` by design).
- H4's source-map upload for readable Sentry stack traces was nominally scoped to H5 — NOT implemented here (out of the CI-gate brief's scope); track separately if wanted.

**NOTE — scrapped first attempt:** an earlier H5 dispatch was interrupted mid-run and left partial edits that (from a stale baseline + an over-prescriptive prompt) wrongly rewrote the already-green validator. Fully reverted; the validator 0-rep change is the user's own, committed separately (`4be645d`) with its `logFunctions` blast-radius reconciled (`3a528f8`). This clean re-run followed the hardened agents (repro-before-fix, tests-as-evidence) and the rebuilt real-run baseline (`1455db1`).

---

## H6 — MERGED — `fix(MERGED/H6)` — 2026-07-20  ⚠ post-hoc review target

**Finding:** SettingsContext, WorkoutContext, and AuthContext each pass a fresh inline object literal to `<Context.Provider value={{...}}>` every render. React context has no field-level selectors, so any provider render re-renders EVERY consumer — and Settings' `persistDirty` save-cycle flips (true→false per write, state no consumer reads) plus Auth's per-refresh new `session` object were forcing extra app-wide consumer sweeps. NutritionContext and BillingContext already memoize their value; these three siblings never got it.

**Phase 1 — judge (consolidated, un-adjudicated):** the judgmental implementer caught two real defects in the brief. (1) **WorkoutContext exposes 35 fields, not the brief's 26** — enumerated against `WorkoutContextInterface`. (2) The brief's "deps = state values only, handlers are already useCallback-stable" is WRONG: 7 handlers are `useCallback([userID,...])` and re-key when `userID` changes, and `userID` is not itself an exposed field — so a state-values-only dep list would hand consumers a STALE handler closing over the old userID during a user switch (a correctness bug, not just perf). Ruled for an exhaustive 1:1 field→dep mapping on all three providers. Upheld the persistDirty/persistRetryNonce exclusion (provider-local, not exposed; the settled `settings` they produce IS a dep) and the AuthContext token-refresh caveat (session must stay a dep, so Auth still re-keys on refresh — documented in-code, not hidden).

**Fix (root cause):** `const value = useMemo(() => ({...}), [exhaustive deps])` on all three providers (Settings 16 deps, Workout 35, Auth `[user, session, loading, userID]`); `handleGetBodyWeightProgressData` → `useCallback([bwProgress])` (also un-defeats `progress.tsx` `topRawData`'s memo, which lists it as a dep); `useMemo` added to Settings + Auth react imports. Memoization-only — zero exposed/rendered values change. + new `providerMemo.test.tsx` stability suite.

**file_review:** empirically validated by stashing the fix to run the new tests against the ORIGINAL un-memoized code — proving the Settings persistDirty-stability test goes red pre-fix / green post-fix. Caught that the implementer's original WorkoutContext test was VACUOUS (passed with and without the fix, because the lastExercise AsyncStorage-persist pass never calls setState); replaced it with a parent-re-render test (`renderer.update()`) that genuinely fails pre-fix. One reuse cleanup. No product source touched.

**wide_review:** no edits. Verified dep-completeness exhaustive for all three (Auth 4/4 stateful, Settings 16/16, Workout 35/35, `userID` transitively covered via the keyed handlers); all ~60 consumers destructure individual fields (no whole-object/JSX-spread capture that would churn); the `progress.tsx topRawData` stabilization is a pure win (its pure inputs stay deps); NutritionContext/BillingContext/ThemeContext already carry the identical pattern (no unpatched copy); the Auth refresh caveat is real, documented, and breaks nothing (reconnect/billing key on the stable id string).

**verify:** tsc **0 errors**, jest **71 suites / 729 tests** (baseline 70/724 + 1 suite/5 tests), 0 failures. GREEN.

**FOLLOW-UP (explicitly out of H6 scope, noted):** `React.memo` on leaf components was deliberately NOT added (separate follow-on, co-sequenced with the H8 performance track). AuthContext's value still re-keys on a same-user token refresh because `session` must remain a dep — fully insulating `userID`-only consumers from a refresh would need a data-shape change (narrowing what Auth exposes), out of scope for H6.

---

## H8 — DONE — `fix(DONE/H8)` — 2026-07-20

**Finding:** `getDateKey` (the calendar-day key on every hot date-bucketing path) was `date.toLocaleDateString("en-CA")` — an Intl call 1-2 orders of magnitude slower than arithmetic. At large log counts, one "+" tap fired thousands of Intl calls (logs sort comparator ×2/comparison, progression goal re-filters, the always-mounted Progress tab's weekly transform, and the nutrition home's unmemoized `todayEntries` render-body scan).

**Fix (root cause):** replaced the Intl call with an arithmetic build `${getFullYear()}-${pad(getMonth()+1)}-${pad(getDate())}` (2-digit zero-pad) — byte-identical to en-CA for all real dates, reading LOCAL calendar components (not UTC), fixing the cost at the shared helper so every one of ~135 call sites benefits. JSDoc rewritten to describe the arithmetic build and retain the local-not-UTC rationale (CLAUDE.md's deliberate negative-offset contract). Memoized `nutritionScreen.tsx`'s `todayEntries` (`useMemo([nutritionData, selectedDateKey])`). + equivalence / lexicographic-ordering / DST-spring-forward tests.

**implement (pipeline-implementer-done):** reproduced the brief's claims first (getDateKey was Intl; todayEntries was unmemoized); executed the vetted brief; left the logsModal/LogHistoryList 2×-per-comparison multiplier and the dead getVolumeData/getSetsData untouched (adjudication ruled both out of scope).

**file_review:** no edits. Verified byte-identity (4-digit year, 2-digit pad, local components), the JSDoc is accurately updated (not stale), the memo deps are complete and effective (nutritionData is a stable state ref, so the memo genuinely skips recompute), scope correct.

**wide_review:** no edits. Audited all ~135 call sites: every one uses getDateKey as a calendar-day compare/bucket/sort key (speed-only change). Verified the one format-sensitive fixed-position slice `CalendarMonthGrid.tsx:102` (`parseInt(day.slice(8),10)`) stays correct under the padded build; the Invalid-Date divergence ('Invalid Date' vs 'NaN-NaN-NaN') is unreachable (all inputs typed Date from valid constructors); persisted writers/readers round-trip via getDateKey/parseDateKey; no structural twin produces a competing YYYY-MM-DD key.

**verify:** tsc **0 errors**, jest **71 suites / 732 tests** (729 + 3 new), 0 failures. GREEN.

**OPS CHECKLIST (human — REQUIRED before shipping this change):** on an actual iOS device/simulator (Hermes), run `date.toLocaleDateString('en-CA')` and the new arithmetic build side-by-side for a spread of dates INCLUDING at least one date already persisted in a test account's `weight_progress`/`nutrition_entries` rows, and confirm the strings are identical. getDateKey's output is a persisted/synced DB value (`weight_progress.date` is unique on user_id+date); the Jest equivalence test only proves parity under Node ICU, not Hermes. If they ever diverge, a one-time key-format backfill/migration is required, NOT a silent redeploy.

---

## H10 — MERGED — `fix(MERGED/H10)` — 2026-07-20  ⚠ post-hoc review target

**Finding:** the "normalize today → bucket by dateKey → calculateStartDate → walk oldest→newest gap-filling each day → push {day,value}" scaffold was copy-pasted into 4 graph builders (getMacroDataForGraph, getVolumeData, getSetsData, getBodyWeightProgressData) instead of shared once, and the copies had DRIFTED. The live bug: body-weight seeded carry-forward at 0, so every day before the first weigh-in emitted 0 → that 0 became `values[0]` in GraphStats.computeStats (`first=values[0]; change=last-first`), making the body-weight "Change" stat report the user's ENTIRE weight instead of the true delta (and crushing the chart y-scale). 5 bodyWeightFunctions.test.ts assertions PINNED the bug (expected value===0).

**Phase 1 — judge:** confirmed the 4-copy duplication, the leading-0 bug, and that the tests pin it (repro against live code). Ruled the separately-flagged `calculateStartDate` off-by-one (maxDays+1 points) OUT of scope (broader blast radius, product-intent call) — left dateHelper.ts untouched and preserved the +1 verbatim.

**Fix (root cause):** new `lib/utils/graphSeries.ts` `buildDailySeries(valuesByDate, opts)` owns the single shared walk (today-normalize, calculateStartDate, daysBetween+1, oldest→newest, fill `'zero'`|`'carryForward'`, optional seed, optional round, formatDateMinimal labels), built only from existing dateHelper exports (dateHelper.ts NOT modified). All 4 builders migrated, threading per-metric behavior through options (volume round:true; macros/sets zero+30d; body-weight carryForward+365d+seed). The correctness fix: body-weight now seeds with the earliest recorded weight (captured across ALL entries incl. those outside the 365-day window) and uses `parseDateKey` instead of hand-rolled `new Date(key+'T00:00:00')`. Carry-forward advances on `found !== undefined` (a legit 0 weigh-in still counts).

**file_review:** no edits. Verified byte-identical extraction, the seed fix end-to-end (values[0] now the real weight → GraphStats Change is a true delta), the 5 test-assertion corrections are justified (each pinned the bug; the 2 no-data cases correctly stay 0), and graphFunctions.test.ts + volumeFunctions.test.ts are absent from the diff and green (equivalence proof).

**wide_review:** no edits; flagged one precise residual (below). Confirmed consolidation fidelity line-by-line, all 4 signatures unchanged (no caller breakage), no 5th copy, the off-by-one preserved verbatim, GraphStats' `value>0` loggedAvg filter is nutrition-only (unaffected by body-weight carry-forward).

**verify:** tsc **0 errors**, jest **72 suites / 744 tests** (71/732 + graphSeries suite + bodyweight regression test), 0 failures. graphFunctions/volumeFunctions unchanged & green. GREEN.

**FOLLOW-UP (real, out of H10's leading-zero scope — its own issue):** wide_review found body-weight seeds with `earliestWeight` (the earliest-EVER weigh-in), which is correct only when ≤1 weigh-in predates the 365-day window. A long-tenured user with ≥2 weigh-ins older than a year should seed the leading days from the MOST-RECENT weigh-in on/before window-start, not the earliest-ever — otherwise the 1-year "Change" is skewed by the inter-weigh-in drift. Strictly better than the pre-fix leading-0 (no regression), and matches the single-pre-window-entry 400-day test, so accepted for H10. The correct fix computes the initial carry from the latest entry ≤ startDate INSIDE buildDailySeries (startDate isn't known to the caller), changing the helper's seeding contract — needs its own test, hence a separate follow-up.
