# Pipeline Verify-Gate Baseline

Everything listed here **pre-dates the issue currently being worked** and does NOT block a
commit. Per-issue verify passes iff: no failing Jest test outside this list, and no `tsc`
error outside this list. **Match tsc errors by file + TS code + symbol, NOT by line or
count** — line numbers and same-symbol repeat counts drift as code is added. A fix that
CLEARS entries here removes them in its own commit; a fix that adds a same-class error to
an already-fully-baselined file (e.g. another `Deno` global in an Edge Function) stays
green. Never add a *new* file/symbol without a `needs-human` escalation.

**Changelog:**
- `2026-07-20` initial snapshot at commit `1d51d47` (8 Jest suites / 67 tests, 25 tsc errors).
- `2026-07-20` after **C1**: cleared `lib/foodDB/__tests__/foodDB.test.ts` (was 57 failing)
  and `lib/openAI/__tests__/openAI.test.ts` (was suite-level) → **6 suites / 10 tests**.
  C1 added 3 `Deno.env.get()` cap reads to the two Edge Functions → **+3 `Cannot find name
  'Deno'`** errors in already-baselined files (28 tsc total). Same class, still baseline.

## Jest — 6 failing suites / 10 failing tests

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

## tsc --noEmit — 28 errors (match by file + code + symbol, not line/count)

App/test code (5) — real, in-surface:
- `app/_layout.tsx` — TS2353 `enableInExpoDevelopment` not in `ReactNativeOptions`
- `components/devTest/DevStatsModal.tsx` — TS2345 EffectCallback returning `() => boolean`
- `context/BillingContext/index.tsx` — TS2322 `void` not assignable to `{ remove?: ... }`
- `context/NutritionContext/functions/__tests__/crudFunctions.test.ts` — TS2345 Mock vs Dispatch<SetStateAction>
- `context/WorkoutContext/functions/__tests__/graphFunctions.test.ts` — TS2353 `name` not in `Partial<Log>`

Deno Edge Functions (23) — whole class unresolvable under the RN tsconfig (Deno modules +
`Deno` global). H5's fix (exclude `lib/supabase/functions/**` from the app tsconfig) clears
ALL of these at once; until then every `Deno`/`https://…` reference in these three files is
baseline, regardless of count:
- `lib/supabase/functions/deleteAccount/index.ts` — TS2307 (Deno/esm imports) + TS2304 `Deno`
- `lib/supabase/functions/fetchFoodDB/index.ts` — TS2307 (Deno/esm imports) + TS2304 `Deno`
- `lib/supabase/functions/fetchOpenAI/index.ts` — TS2307 (Deno/esm imports) + TS2304 `Deno`
