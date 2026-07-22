# PLATES — Production-Readiness Audit

**Generated:** 2026-07-21 · **Scope:** repo root (`com.LiftTrition.App`, app v1.0.4, pre-launch)
**Method:** six parallel domain agents (security-cost, logic-correctness, ui-ux, infra-reliability, performance, code-structure), audit-only, every finding anchored to a `file:line` the agent read.

## Orientation

This codebase has already absorbed a substantial hardening pass — server-side premium gating, atomic per-user AI quotas, Keychain token storage, PowerSync dead-letter classification, a sign-out flush gate, provider-value memoization, and broad test colocation all verified in place. The residual risk is **not** a leaky security surface. It concentrates in three places: (1) a handful of **App-Store-review and launch-gating items** that will get the binary rejected or ship misleading UI, (2) an **operational deploy gap** — a known-pending Postgres migration plus no ledger/OTA/runbook to catch the next one, and (3) **scale-latent performance** that is invisible at day one and degrades with account age.

Totals: **2 Critical · 12 High · 27 Medium · 20 Low** (61 deduplicated issues; see `manifest.json`).

---

## 🚫 Launch blockers (Critical + High)

These must be resolved or consciously accepted before submitting to App Review.

| ID | Title | Domain(s) | Why it blocks |
|----|-------|-----------|---------------|
| crit-001 | Fabricated "★★★★★ 5.0" rating on login/paywall/subscription | ui-ux | App Review 2.3.1 (misleading), on monetization screens. Pre-launch = no rating can exist. |
| crit-002 | Pending `nutrition_calories_real.sql` migration = silent write-drop | infra | Client already writes REAL calories; until the Postgres ALTER runs, decimal-calorie rows are dead-lettered (dropped) on sync. |
| high-005 | Camera permission ships default purpose string | ui-ux | No `NSCameraUsageDescription`; Apple rejects (5.1.1). Camera is the flagship premium feature. |
| high-006 | Modal swipe-dismiss silently destroys staged/edited work | ui-ux | Data-loss UX on the most effortful flows (editEntry, foodDB staging); no Cancel control exists. |
| high-007 | Core logging flows unusable with VoiceOver | ui-ux | Every FAB/edit/delete affordance is an unlabeled icon button — accessibility blocker across the app. |
| high-001 | FatSecret single-result search crashes edge function (500) | logic | A search returning exactly one food throws; also silently degrades AI branded-enrichment accuracy. |
| high-002 | No OTA path (`expo-updates` absent) | infra | Any day-one JS bug needs a full App Review cycle (~1–2 days) to fix. Capability must be compiled into v1 or v1 users can never be hot-fixed. |
| high-003 | Production sync outage is invisible in Sentry | infra | First-sync timeout, "connected-but-not-syncing," and upload retry loops emit zero telemetry — first signal would be App Store reviews. |
| high-004 | No migration ledger (applied vs pending unknowable) | infra | The repo can't distinguish applied from pending SQL; guarantees crit-002's class recurs. |
| high-011 | Screen bodies under `app/` are live unguarded routes | code-structure | `nutritionScreen`/`workoutScreen`/`adjustMeasurements` mount outside every `Stack.Protected` guard — deep-link reachable signed-out. |
| high-012 | WorkoutContext runs untested inline handlers; tests pin dead, drifted duplicates | code-structure | Inverted test confidence: CI green validates code production never runs; the live archive/order logic is unpinned and has already diverged. |
| high-008 | Unbounded full-history hydration at startup | performance | Both contexts `SELECT *` all history into JS memory, gating first render; grows without bound, hard SQLite bind-var cliff at ~32k nutrition entries. |
| high-009 | Settings tab polls SQLite every 1s forever | performance | After one visit, a 1Hz DB read + setState runs for the whole session across all tabs (no focus gating) — battery + DB contention, all users, day one. |
| high-010 | Exercise search: un-debounced fuzzy search over 1,317 items per keystroke | performance | Typing jank in the two core exercise pickers on day one. |

**Fastest blockers to clear** (low effort, high payoff): crit-001 (delete three rating rows), crit-002 (run one SQL file), high-005 (one `app.json` plugin entry). These three are hours of work and remove the two Critical items plus a probable metadata rejection.

---

## Findings by severity (all domains)

### Critical

- **crit-001 — Fabricated 5.0 star rating** (`app/authScreens/login.tsx:50-55`, `app/onboardingScreens/paywall.tsx:170-173`, `app/settingsScreens/subscription.tsx:142-145`). Hardcoded `★★★★★ 5.0` above purchase CTAs on a pre-launch app. Remove the rows until real ratings exist. *(Deleting them also removes three hardcoded `#FFD93D` color literals — see low-014.)*
- **crit-002 — Pending calories migration silently drops writes** (`lib/supabase/migrations/nutrition_calories_real.sql:7-11`, `lib/powersync/AppSchema.ts:62`, `lib/powersync/Connector.ts:46-59,247-254`). Client persists `calories` as REAL and sums fractional values; the live Postgres column is still INTEGER until the ALTER is applied. An integer-column rejection is class-22 → non-retryable → dead-lettered (captured to Sentry with no payload, then discarded). **Run the two ALTERs in Supabase now and verify a fractional entry round-trips.** Operational, not a code change — the app side is already done.

### High

**Infra / deploy (4):**
- **high-002 — No OTA update path** (`package.json:15-68`, `app.json`, `eas.json:6-17`). Add `expo-updates` + `runtimeVersion` + EAS channels *before* first submit, or v1 is unpatchable OTA forever.
- **high-003 — Sync outages invisible in Sentry** (`lib/hooks/useAsyncLoad.ts:30-35`, `components/GuardComponents/PowerSyncGuard.tsx:22-27`, `lib/powersync/waitForFirstSync.ts:15-30`, `lib/powersync/orchestrator.ts:141-148`, `components/GuardComponents/SyncWatchdog.tsx:89-95`). Capture `FirstSyncTimeoutError`/connect failures, breadcrumb stale-kicks and upload/download-error transitions.
- **high-004 — No migration ledger** (`lib/supabase/migrations/`). Adopt Supabase CLI timestamped migrations or a `LEDGER.md`; add a release-checklist step to apply pending SQL before `eas build`.
- *(Also High from other domains: crit-002 is the acute instance of this same deploy-ordering gap.)*

**UI / App-Review (3):**
- **high-005 — Camera purpose string** (`app.json:11-17,52-58`). Add the `expo-camera` plugin with a real `cameraPermission` string.
- **high-006 — Swipe-dismiss data loss** (`app/_layout.tsx:37-40` + `editEntry.tsx`, `addNutritionModal.tsx`, `foodDBModal.tsx`, `savedNutritionModal.tsx`, `addExerciseModal.tsx`). Add `beforeRemove` "Discard changes?" guards (pattern already exists in `analyzingModal.tsx:36-42`).
- **high-007 — VoiceOver labels** (home FAB `app/(tabs)/index.tsx:28-72`, `Fab.tsx:93-97`, `ModeSwitcher.tsx:30-42`, `Entry.tsx:43-47`, `Log.tsx:52-56`, + ~8 more). Add `accessibilityLabel`/`accessibilityRole` to icon-only touchables; the team's own good pattern is in `cameraScreen.tsx:231-241`.

**Logic (1):**
- **high-001 — Single-result FatSecret crash** (`lib/supabase/functions/fetchFoodDB/index.ts:94-101`). FatSecret returns `foods.food` as an object (not array) for one hit; `list.map` throws → 500. The fix already exists three lines down for `servings.serving`. Normalize to array.

**Performance (3):**
- **high-008 — Unbounded hydration** (`context/WorkoutContext/database/powersyncStore.ts:70-96`, `context/NutritionContext/database/powersyncStore.ts:114-152`). Window to last ~90d (workouts) / ~365d (nutrition), page older on demand, replace the ingredients `IN(...)` with a bounded JOIN, `Promise.all` the per-loader queries. *(Also shrinks the full-reload cost on every failed write — PERF's rollback-reload note folds in here.)*
- **high-009 — 1Hz Settings poller** (`app/(tabs)/settings.tsx:42-60`). Gate on focus and slow to 2–5s, or switch to `powerSync.registerListener`.
- **high-010 — Un-debounced 1,317-item search** (`app/workoutScreens/addExerciseModal.tsx:46-50`, `components/NeutralComponents/ScrollableList.tsx:45-51`). Debounce ~200–300ms; `useMemo` the filter/sort; precompute lowercased titles.

**Code structure (2):**
- **high-011 — Unguarded routes** (`app/(tabs)/index.tsx:1-2`, `app/nutritionScreens/nutritionScreen.tsx:17`, `app/workoutScreens/workoutScreen.tsx:13`, `app/settingsScreens/adjustMeasurements.tsx:11`, `app/_layout.tsx:167-251`). Move the two screen bodies into `components/`, delete the orphaned `adjustMeasurements`, and extend the M22 route-guard test to assert *every* `app/` route is inside a `Stack.Protected` group.
- **high-012 — Inverted test confidence** (`context/WorkoutContext/functions/exerciseFunctions.tsx`, `logFunctions.tsx` vs live inline handlers `context/WorkoutContext/index.tsx:150-292`). Consolidate to the live semantics, repoint the handlers, re-pin the tests to what actually runs.

### Medium (27)

**Security / cost:** consume_ai_quota cross-user quota DoS (med-001, `ai_usage_quota.sql:40-57`); foodDB fetch has no timeout — cost + hang (med-002, merged with ui-ux); unbounded AI input size / no `max_tokens` (med-003).

**Logic:** AI-vision ingredients accepted with zero shape validation → stored items silently collapse to 0 on next edit (med-004, `aiFunctions.tsx:98-119`); natural-key PATCH silently no-ops when local id ≠ server id (med-005, merged with infra dead-letter); `trainedDaysThisWeek` stale across week rollover (med-006); `reloadFromDisk` rollback clobbers a concurrent newer edit (med-007, merged with code-structure); upload-queue stats fail-open `?? 0` in the sign-out gate (med-008, merged with infra).

**UI/UX:** context-load-failure screen has no sign-out escape (med-009); dark-mode nutrition CTAs ~2.5:1 contrast (med-010, `context/ThemeContext/colors.ts:3-6,93-97`); fixed-height CTAs clip at large Dynamic Type (med-011, the sites M29 missed); selection controls don't expose `selected` to a11y (med-012); disabled week-forward chevron reads as enabled (med-013).

**Infra:** `assertRequiredEnv()` throws before `Sentry.init` — crash-loop with no telemetry (med-014); no dev/preview/prod env separation, preview reports Sentry env "production" (med-015); meal photos in purgeable cache, synced `photo_uri` is a dead path (med-016); no backup/DR runbook (med-017); CI tests advisory, no lint gate, builds not CI-gated (med-018).

**Performance:** charts remount with a 200ms artificial spinner on every data change while the written-and-tested downsampler has zero callers (med-019); every write re-renders the whole navigator shell + re-runs full-history transforms (med-020); `DailyIntakeCard` aggregates full history in its render body (med-021).

**Code structure:** `offerings: any` erodes the billing type surface (med-022); purchase/restore duplicated across paywall vs subscription, leave-block on only one (med-023); nutrition-store twin-table duplication + non-null-assertion row parsing (med-024); dead-but-tested code and zero-importer files (med-025); six unused dependencies incl. Node-only `jsonwebtoken` (med-026); wrong-direction type dependencies across layers (med-027).

### Low (20)

Security: placeholder replication password in committed SQL (low-001); no length cap on support free-text (low-002); food search fires with no min query length (low-003).
Logic: `validateLog` passes NaN through (low-004); `calculateStartDate` off-by-one / 31-point windows (low-005); streak nudge can assert a dead streak (low-006); `updated_at` written in two timestamp formats (low-007); nutrition modals dismiss on validation reject + negative macros enable the CTA (low-008); editEntry silently zeroes an unparseable macro (low-009).
Infra: splash never hides if the logo asset load rejects (low-010).
Performance: upload queue drains one round-trip per row (low-011); list rows not `React.memo`'d (low-012).
Code structure: devTest preview twins drifting (low-013); modal chrome copy-pasted 12× + hardcoded colors (low-014); inconsistent inline exercise-name checks + one unguarded submit CTA (low-015); test gaps on `useNotificationScheduler`/`confirmDelete` (low-016); `ModeSwitcher.tsx` default-exports `CustomHeader` (low-017).
UI/UX: "How It Works" promises a nonexistent fatigue section (low-018); submitting/disabled CTAs keep the enabled look (low-019); Fab menu has no outside-tap dismissal (low-020).

---

## Cross-domain overlaps (real hotspots)

Where two independent agents landed on the same code, treat it as a confirmed hotspot, not a coincidence.

1. **`reloadFromDisk` rollback — duplication that already became a race bug** (med-007). **code-structure** flagged it as triplicated scaffolding where only `SettingsContext` got the stale-edit guard; **logic-correctness** independently flagged the exact same unguarded copies in Workout/Nutrition as a race that silently drops a just-entered log/meal after a transient write failure. This is the textbook "drift-into-bug" the coordinator brief predicted for the code-structure ↔ logic-correctness seam, and the highest-value Medium: one extracted `useReloadFromDisk` helper fixes the bug and the duplication together. **performance** also touches this function (full-reload cost), resolved by the high-008 windowing.

2. **The Connector natural-key PATCH** (med-005). **logic-correctness** found that PATCH-by-local-id silently matches 0 rows (and reports success) for `weight_progress`/`user_exercises`, reverting cross-device edits; **infra-reliability** independently flagged the same 0-row-PATCH-succeeds behavior plus dead-letter events lacking a replayable payload. Same file, same root cause — merged.

3. **The sign-out flush gate `?? 0`** (med-008). **logic-correctness** and **infra-reliability** both independently identified `uploadQueueStats.ts:8` as fail-open: an SDK stats-shape change reads as "queue empty," letting `disconnectAndClearPowerSync` wipe unsynced writes. Two domains converging on one line = fix it.

4. **The foodDB fetch has no timeout** (med-002). **security-cost** framed it as cost (the edge function keeps billing after the client abandons); **ui-ux** framed it as a dead-end uncancelable spinner. Same missing `AbortSignal.timeout` on `lib/foodDB/foodDB.ts:42-49`.

5. **WorkoutContext dead-but-tested handlers** (high-012). **code-structure** owns this, but it explicitly cross-flags logic-correctness to confirm the live archive/order semantics before re-pinning tests — the same duplication-drift seam as #1.

**On the security-cost ↔ performance "query efficiency" overlap the brief anticipated:** it was smaller than expected, and that's a genuine finding. Performance confirmed the SQLite queries are properly indexed (`AppSchema.ts:38-163`) and food search is already debounced 700ms, so the two domains did *not* pile onto a shared query-efficiency bug. Where they converge instead is external-call efficiency: the foodDB timeout (#4 above) and search-call minimization (security-cost's min-query-length low-003 complements performance's confirmed debounce).

---

## Go / No-Go

**Recommendation: NO-GO for App Store submission as-is — but the gap is narrow and mostly mechanical, not architectural.**

The core is sound and already hardened. What stands between this build and submission is a short, concrete list: two Critical items (one is deleting three UI rows, one is running a SQL file), three probable-rejection UI/accessibility items, and one crashing edge-function path. None require redesign. The infra-deploy gaps (OTA, ledger, telemetry, runbook) are the difference between "ships" and "ships safely" — I'd treat OTA (high-002) as a hard gate because it can't be added retroactively to v1, and the rest as fast-follow if launch is time-boxed. The performance findings are scale-latent (fine for launch-day users, degrade over months) and can trail the first release except where they're cheap.

**Re-evaluate to GO once:** crit-001, crit-002, high-001, high-005, high-006, high-007, and high-002 are closed. That set is achievable in a focused sprint.

### Top 5 actions

1. **Clear the two Criticals + camera string (hours, unblocks review):** delete the fabricated rating rows (crit-001), run `nutrition_calories_real.sql` in Supabase and verify a fractional entry syncs (crit-002), add the `expo-camera` purpose string (high-005).
2. **Fix the FatSecret single-result crash (high-001)** — one-line array normalization + a unit test on a single-object payload; it also silently degrades AI macro accuracy today.
3. **Make the app submittable-accessible & swipe-safe (high-006, high-007)** — `beforeRemove` discard guards on the five dirty modals, and `accessibilityLabel`s on the icon-only core-flow buttons.
4. **Add OTA before the first binary (high-002)** and stand up the deploy safety net that prevents crit-002 from recurring: migration ledger (high-004) + sync telemetry (high-003) + a one-page `RUNBOOK.md` (med-017). OTA is the non-negotiable piece — it can't be retrofitted to shipped installs.
5. **Land the two convergence-flagged data-safety Mediums (med-007, med-008)** — the `reloadFromDisk` race guard and the sign-out-gate `?? 0` fail-open. Both were independently found by two agents and both risk silent user-data loss.

*Audit-only. No code was modified. Full deduplicated issue list with statuses in `audit/manifest.json`.*
