# Pipeline Verify-Gate Baseline

**Rebuilt from an ACTUAL `npx jest --ci` + `npx tsc --noEmit` run — not a doc guess.**
Everything listed here pre-dates the issue currently being worked and does NOT block its
commit.

**How the gate reads this (runbook step 7):**
- **tsc is the HARD gate.** A commit is blocked by any tsc error NOT on this list. Match by
  **file + TS code + symbol**, never by line or count — those drift as code is added. A fix
  that CLEARS an entry removes it here in its own commit.
- **jest is an ADVISORY tripwire, not a correctness oracle.** This suite is uneven, so a
  green run does not prove correctness and a red test is not an automatic block. This list
  exists only so the driver can tell a NEW red test (was-green-now-red → investigate) from a
  pre-existing one (already here → ignore). A test that flips green gets removed here.

## tsc --noEmit — 3 errors (all app/test-surface; Deno dir excluded from tsconfig)

- `components/devTest/DevStatsModal.tsx` — TS2345, EffectCallback given `() => () => boolean`.
  True source is `lib/powersync/watchdogStatus.ts:40`, whose returned cleanup
  `() => listeners.delete(listener)` yields a boolean (Set.delete). Fix at the source.
- `context/NutritionContext/functions/__tests__/crudFunctions.test.ts` — TS2345, jest `Mock`
  not assignable to `Dispatch<SetStateAction<NutritionEntry[]>>` (mock typing).
- `context/WorkoutContext/functions/__tests__/graphFunctions.test.ts` — TS2353, object literal
  specifies `name`, which is not a key of `Partial<Log>` (fixture typing).

## jest — 4 failing suites / 7 failing tests

**`lib/notifications/__tests__/prefs.test.ts`** (2)
- notification prefs › returns defaults when nothing stored
- notification prefs › merges partial stored shapes over defaults

**`lib/notifications/__tests__/builders.test.ts`** (1)
- buildMealReminders › schedules 7 days x 3 meals when nothing logged and all times upcoming

**`context/NutritionContext/functions/__tests__/graphFunctions.test.ts`** (1)
- Graph Functions › getMacroDataForGraph › Edge Cases › should handle onboarding date in the future

**`lib/powersync/__tests__/connector.test.ts`** (3)
- Connector › uploadData › should handle PUT operation (create record)
- Connector › uploadData › should handle PATCH operation (update record)
- Connector › uploadData › should handle multiple operations in a transaction

## Changelog

- `2026-07-20` **REBUILT from a real run at commit `3a528f8`** (jest: 4 failed / 66 passed
  suites, 7 failed / 717 passed tests; tsc: 3 errors). This replaces the hand-maintained
  baseline, which had drifted into a hazard: it listed `validator.test.ts` (negative reps,
  RPE > 10) as failing when that suite was actually GREEN — a phantom that would have let the
  gate mask a real regression against exactly those test names. The rebuild is the honest
  starting point for H5 onward.
- Still in effect from earlier commits: `lib/supabase/functions/**` excluded from tsconfig +
  jest (H1) so the former ~20-error Deno-can't-resolve class does not appear here (validate
  Edge Functions with `deno check`, not this gate); `app/_layout.tsx` TS2353 removed (H4);
  `context/BillingContext/index.tsx` TS2322 removed (H5-partial `ca5fda2`); validator suite
  green after the 0-rep fix (`4be645d`) and its `logFunctions` blast-radius reconciled
  (`3a528f8`).
