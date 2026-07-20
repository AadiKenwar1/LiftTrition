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

## tsc --noEmit — 0 errors (CLEAN)

H5 cleared the last 3 (watchdogStatus cleanup return at its source; crudFunctions +
WorkoutContext graphFunctions test-mock types). `lib/supabase/functions/**` stays excluded
from tsconfig (H1). Any tsc error now is NEW — the CI hard gate (H5) blocks on it.

## jest — 0 failing (CLEAN)

H5 corrected the last 4 stale suites (connector mocks, prefs/builders meal-time defaults,
NutritionContext graph future-date). Full suite is **70/70 suites, 724/724 tests**. Any red
test now is NEW — investigate it; it is not pre-existing.

## Changelog

- `2026-07-20` **REBUILT from a real run at commit `3a528f8`** (jest: 4 failed / 66 passed
  suites, 7 failed / 717 passed tests; tsc: 3 errors). This replaces the hand-maintained
  baseline, which had drifted into a hazard: it listed `validator.test.ts` (negative reps,
  RPE > 10) as failing when that suite was actually GREEN — a phantom that would have let the
  gate mask a real regression against exactly those test names. The rebuild is the honest
  starting point for H5 onward.
- `2026-07-20` after **H5**: cleared ALL remaining entries — the 3 tsc errors and all 4 jest
  suites. **Baseline is now clean: tsc 0 errors, jest 724/724.** The CI gate added by H5
  blocks on tsc; jest is advisory.
- Still in effect from earlier commits: `lib/supabase/functions/**` excluded from tsconfig +
  jest (H1) so the former ~20-error Deno-can't-resolve class does not appear here (validate
  Edge Functions with `deno check`, not this gate); `app/_layout.tsx` TS2353 removed (H4);
  `context/BillingContext/index.tsx` TS2322 removed (H5-partial `ca5fda2`); validator suite
  green after the 0-rep fix (`4be645d`) and its `logFunctions` blast-radius reconciled
  (`3a528f8`).
