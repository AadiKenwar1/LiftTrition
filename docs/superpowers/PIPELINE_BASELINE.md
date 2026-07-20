# Pipeline Verify-Gate Baseline — recorded 2026-07-20 (pre-pipeline, commit 1d51d47)

Everything listed here **pre-dates the fix pipeline** and does NOT block a commit.
Per-issue verify passes iff: no failing Jest test outside this list, and no `tsc` error
outside this list (match tsc errors by **file + TS code + symbol** — line numbers drift).
A fix that CLEARS entries here is a bonus: remove the cleared entries and note it in the
run log. Never add new entries without a `needs-human` escalation.

## Jest — 8 failing suites / 67 failing tests

**`lib/openAI/__tests__/openAI.test.ts`** — fails at SUITE level (compile/setup, no individual tests run).

**`lib/notifications/__tests__/builders.test.ts`** (1)
- buildMealReminders schedules 7 days x 3 meals when nothing logged and all times upcoming

**`lib/notifications/__tests__/prefs.test.ts`** (2)
- notification prefs returns defaults when nothing stored
- notification prefs merges partial stored shapes over defaults

**`context/WorkoutContext/functions/__tests__/validator.test.ts`** (2)
- Workout Validator validateLog should return false for negative reps
- Workout Validator validateLog should return false for RPE > 10

**`lib/powersync/__tests__/connector.test.ts`** (3)
- Connector uploadData should handle PUT operation (create record)
- Connector uploadData should handle PATCH operation (update record)
- Connector uploadData should handle multiple operations in a transaction

**`context/NutritionContext/functions/__tests__/graphFunctions.test.ts`** (1)
- Graph Functions getMacroDataForGraph Edge Cases should handle onboarding date in the future

**`context/WorkoutContext/functions/__tests__/logFunctions.test.ts`** (1)
- Log Functions addLog Edge Cases should handle zero reps

**`lib/foodDB/__tests__/foodDB.test.ts`** (57) — every currently-failing test in this file;
the full list is the set of tests failing at commit 1d51d47. Operational rule: after a fix
touching `lib/foodDB/`, re-run this suite and compare its failing-test names against
`%TEMP%\jest-baseline.json` (regenerate the snapshot if TEMP was cleared); more failures
than 57 or a newly-failing name → red.

## tsc --noEmit — 27 errors (match by file + code + symbol, not line)

App/test code (6):
- `app/_layout.tsx` — TS2353 `enableInExpoDevelopment` not in `ReactNativeOptions`
- `components/devTest/DevStatsModal.tsx` — TS2345 EffectCallback returning `() => boolean`
- `context/BillingContext/index.tsx` — TS2322 `void` not assignable to `{ remove?: ... }`
- `context/NutritionContext/functions/__tests__/crudFunctions.test.ts` — TS2345 Mock vs Dispatch<SetStateAction>
- `context/WorkoutContext/functions/__tests__/graphFunctions.test.ts` — TS2353 `name` not in `Partial<Log>`

Deno Edge Functions (21 — Deno modules/globals can't resolve under the RN tsconfig):
- `lib/supabase/functions/deleteAccount/index.ts` — TS2307 ×2, TS2304 `Deno` ×2
- `lib/supabase/functions/fetchFoodDB/index.ts` — TS2307 ×3, TS2304 `Deno` ×4
- `lib/supabase/functions/fetchOpenAI/index.ts` — TS2307 ×2, TS2304 `Deno` ×7

> H5's fix (CI gate) is expected to clear much of this baseline (excluding the Deno
> functions from the app tsconfig is the root-cause fix for those 21). When it lands,
> update this file to the new, smaller baseline in the same commit.
