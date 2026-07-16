# AUDIT_MINOR execution status

Subagent-driven execution. No git commits — changes stay in the working tree. Tasks 1–7 ran sequentially; Tasks 8+ ran in conflict-free parallel waves (Wave 1: 8, 9, 15, 16, 18 · Wave 2: 10, 12, 13). **All 13 implemented.**

| Task | Issue | Status | Explainer |
| ---- | ----- | ------ | --------- |
| 1 | Notes save on every keystroke | ✅ done | [01-notes-saving.md](01-notes-saving.md) |
| 2 | Archived list order drift | ✅ done | [02-archived-order.md](02-archived-order.md) |
| 3 | Four default-pace values | ✅ done | [03-default-pace.md](03-default-pace.md) |
| 6 | DST hides day one of BW chart | ✅ done | [06-dst-day-count.md](06-dst-day-count.md) |
| 7 | kcal / cal / calories labels | ✅ done | [07-calorie-label.md](07-calorie-label.md) |
| 8 | lb / lbs labels | ✅ done | [08-weight-unit-label.md](08-weight-unit-label.md) |
| 9 | Set delete has no confirm | ✅ done | [09-set-delete-confirm.md](09-set-delete-confirm.md) |
| 10 | Copy-pasted weeks/age math | ✅ done | [10-dedup-math.md](10-dedup-math.md) |
| 12 | Fast double-delete un-deletes | ✅ done | [12-fast-delete.md](12-fast-delete.md) |
| 13 | Food cache survives sign-out | ✅ done | [13-food-cache-signout.md](13-food-cache-signout.md) |
| 15 | Env vars unpinned | ✅ done | [15-env-contract.md](15-env-contract.md) |
| 16 | Tests certify dead code | ✅ done | [16-workout-tests.md](16-workout-tests.md) |
| 18 | Onboarding loses answers | ✅ done | [18-onboarding-persist.md](18-onboarding-persist.md) |

Not in scope (skipped or promoted to AUDIT_MAJOR): 4, 5, 11, 14, 17.

Known pre-existing test failures (fail at HEAD, unrelated to these tasks): `WorkoutContext/validator.test.ts` (RPE message), `WorkoutContext/logFunctions.test.ts` (zero-reps), `NutritionContext/graphFunctions.test.ts` (future-onboarding edge vs a clamp), `powersync/connector.test.ts` (uploadData mock), and the whole `lib/foodDB/foodDB.test.ts` suite (Supabase client throws at import when `EXPO_PUBLIC_*` is unset under Jest — an env/test-harness gap, not product code).

All changes are in the working tree (no commits). Migrations to run at release: none added by these 13 (brand column belongs to promoted issue 17). EAS: env vars already configured as secrets (Task 15's assertion + `.env.example` are the client-side additions).
