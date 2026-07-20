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
