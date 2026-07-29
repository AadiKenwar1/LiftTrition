# Conventions audit — adoption gaps

Audit of the conventions in `CLAUDE.md` against the code at HEAD. Report only — nothing here
has been changed.

**Revised 2026-07-28** against the amended conventions (areas defined, coverage tiered by logic
kind, logic placement reframed, dev code exempt). Counts below are recomputed from the original
six-agent sweep, not re-measured — where a number is an estimate it says so.

## Verdict at a glance

| Rule | CLAUDE.md | Adoption | Was | Now |
|---|---|---|---|---|
| Comment rule — one-liner per function | :104 | **47%** | 790 of 1,310 bare | **394 of 748 bare** |
| Cite only code, never docs/tickets | :104 | **violated in 34 files** | ~86 lines | **71 lines** |
| Tests before implementation | :116 | **not followed** | — | last 3 feature commits |
| One test file per exported function | :122 | **0%** | 438 exports | **293 exports**, 83 files |
| Coverage meets its logic-kind bar | :120 | **unscored** | 3 of 83 reached 40 | **void** — needs classification |
| The four buckets (business rules only) | :120 | **0%** | 0 of 83 files | **0**, and now a narrower target |
| One system file per area | :122 | **1 of 14** | 1 of 26 | **1 of 14** |
| `<module>/__tests__/README.md` | :127 | **0 of 28** | 0 of 30 | **0 of 28** |
| `tests/<area>.md` | :128 | **0 of 14** | 0 of ~22 | **0 of 14** |
| `tests/` is documentation only | :130 | **PASS** | PASS | PASS |
| Test-change rule | :132 | **unenforceable** | — | nothing enforces it |
| Logic placement | :106 | **16 violations** | ~84 | **16** |

Unchanged and still the reason everything else is optional: **CI runs the suite with
`continue-on-error: true`** (typecheck is the only blocking gate), and **nothing enforces the
documentation rule** — no CI step, no git hook, no ESLint config, no mention in any of the 18
`.claude/` agent files.

## What the amendments changed

| | Effect |
|---|---|
| **Dev exemption** | Removes 145 exports, ~68 misplaced functions, 389 uncommented functions, ~15 citations, 2 `__tests__/` folders |
| **Areas defined** | 26 speculative areas → **14 real ones**. Five "areas with no tests at all" vanish — they aren't areas |
| **Tiering by logic kind** | Implied scope drops from ~17,500 cases to **~3,500–4,500** (estimate). ~4× today's 951, not 18× |
| **Logic placement reframed** | `context/*/functions/` is now legal. 9 of the 16 surviving violations change destination |

Two corrections to the first cut: the app/components comment rate **rises** after the exemption
(74% → 78%), because `app/devTest/` was the only fully-clean folder in that scope. And **9** of
the logic-placement violations change destination, not 6.

---

## 1. Comment rule — forbidden citations (`CLAUDE.md:104`)

**71 lines across 34 files.** The best-commented files are the violators — milestone IDs ride
inside otherwise-excellent prose.

**Documents named directly (4 remaining):**

| Location | Cites |
|---|---|
| `context/WorkoutContext/functions/__tests__/progressionFunctions.test.ts:67` | `audit/progressFixes-scenarios.md` |
| `lib/openAI/__tests__/mealImage.test.ts:3` | `PRODUCTION_READINESS_FIXES.txt` |
| `context/AuthContext/__tests__/setUser.test.ts:5` | `docs/PRODUCTION_READINESS_FIXES.txt` |
| `context/NutritionContext/functions/entryBuilders.ts:7` | `2026-07-15-universal-item-editor-design` |

**Milestone / audit IDs — clusters:**

- `lib/supabase/functions/fetchOpenAI/index.ts` — 5× `M8`, 2× `audit C1`/`H1`
- `lib/foodDB/foodDB.ts` — 5× `audit C1`/`H1`; `lib/openAI/openAI.ts` — 3×
- `context/WorkoutContext/database/__tests__/powersyncStore.test.ts` — 4× `M15`/`M16`
- `lib/powersync/__tests__/connector.test.ts` — `L3`, `M12`
- `app/nutritionScreens/` — `M8`, `M9`, `H9`, `audit C1/H1`, `audit L24`
- `components/NutritionComponents/` — `Issue 8` ×3 (`GoalReachedPrompt`, `GoalReachedBanner`, `GoalPromptHost`)
- Singles: `app/workoutScreens/workoutScreen.tsx:40`, `app/onboardingScreens/goals.tsx:31`,
  `context/NutritionContext/functions/aiFunctions.tsx:94`,
  `context/SettingsContext/__tests__/persistEffect.test.tsx:12`,
  `lib/supabase/migrations/ai_usage_quota.sql:1`

**Leaked beyond comments — worse, because these are output:**

- **Test names (7):** `'AnalyzingModal cancellation (M8)'` · `'CameraScreen library pick (M9 regression guard)'` ·
  `'_layout.tsx dev-only route guarding (M22)'` · `'NutritionScreen delete confirmation (Issue C4)'` ·
  `'analyzeAndAddPhoto signal propagation (M8)'` · `'cancellation (M8)'` · `'… rollback race (M15)'`
- **Fixture data (1):** `context/WorkoutContext/__tests__/fullExerciseLib.test.tsx:106-107` —
  `'L19-Override-Muscle'`, `'L19-Equip'`, `'L19-Custom-Muscle'`

*Exempt now:* `ProgressIndicatorTest.tsx` (`audit/progressFixes.md`), the 7 `onboardingresearch.md`
references, `registry.tsx`'s dated KNOWN ISSUES block, the 11 DevHub on-screen labels, and the
devTest half of the Issue-8 chain.

## 2. Comment rule — missing comments (`CLAUDE.md:104`)

| Scope | Bare / total named functions |
|---|---|
| `app/` + `components/` | **275 / 353 (78%)** |
| `lib/` + `context/` | **119 / 395 (30%)** |
| **Combined** | **394 / 748 (53%)** |

**Zero-compliance files** (100% bare):
`context/NutritionContext/functions/crudFunctions.tsx` (7/7) · `lib/utils/permissions.ts` (2/2) ·
`lib/powersync/watchdogStatus.ts` (3/3) · `context/SettingsContext/functions/validator.tsx` (3/3) ·
`app/settingsScreens/adjustNutrition/` (15/15)

**Systemic:** every provider and every context hook is uncommented — `AuthProvider`,
`BillingProvider`, `NutritionProvider`, `SettingsProvider`, `WorkoutProvider`, `useAuth`,
`useBilling`, `useNutrition`, `useWorkout` (11 of 12).

**Worst production folders:** `components/NeutralComponents/` 64/66 · `app/workoutScreens/` 32/33 ·
`app/nutritionScreens/` 41/55 · `app/onboardingScreens/` 26/32 · `components/GraphComponents/` 16/24

**Genuinely clean:** `lib/notifications/` · `lib/supabase/` · `context/WorkoutContext/database/` ·
`context/WorkoutContext/functions/` (1/50) · `context/BillingContext/functions/` · all `app/**/__tests__/`

`makeStyles` was 159 of the original 664 `app/`+`components/` misses. The post-exemption share
isn't broken out, but it remains the single biggest mechanical win.

## 3. Test layout (`CLAUDE.md:120-124`)

**One file per exported function — holds nowhere.** 83 test files cover **293** non-exempt
exports. Worst absorbers: `context/WorkoutContext/database/powersyncStore.ts` (17 exports → 1 file),
`lib/utils/dateHelper.ts` (16 → 1, only 4 tested by name), `progressionFunctions.ts` (10 → 1).

**Coverage vs the logic-kind bar — unscored.** The old "3 of 83 reach 40" measured a rule that no
longer exists. Nothing can be scored until functions are classified into the six kinds. Current
suite: **951 executed cases** (940 passing).

**Implied scope, estimated:** ~40 business-rule exports at 40+ · ~35 formulas at ~12 · ~15
validation at ~12 · ~25 state/concurrency at transition coverage · ~90 persistence/integration at
~18 · ~50 presentation at branch count. Lands around **3,500–4,500 cases** — roughly 4× today,
against 18× under the old flat rule. Treat as a planning figure, not a measurement.

**The four buckets — used nowhere, and the target is now narrower.** Zero occurrences of "Happy",
"Miscellaneous", "Misc" or "Variety" in any describe block. The collision got *sharper*: the older
`Normal Cases` / `Edge Cases` / `Property Validation` / `Challenging Cases` scheme lives in ~10
WorkoutContext files — exactly the business-rule files the four buckets now apply to. Two of four
names match, so those files will read as compliant and aren't.

**System file per area — 1 of 14.** Only `context/WorkoutContext/functions/__tests__/flowOfLayers.test.ts`.

Missing in: `utils` · `powersync` · `supabase` · `notifications` · `fooddb` · `openai` · `hooks` ·
`nutritioncontext` · `settingscontext` · `authcontext` · `billingcontext` · `themecontext` · `shell`

Quick win: `app/nutritionScreens/__tests__/stagedPreview.test.ts` is already system-shaped — it
chains `entryBuilders` and `items` against a hand-rolled oracle — but it's filed under a screen
folder. Moved into `context/NutritionContext/`, it becomes that area's system file.

**Colocation — 1 violation, and it never runs.**
`lib/supabase/functions/fetchOpenAI/entitlement.test.ts` is the only test outside a `__tests__/`
folder. It's Deno (`Deno.test`, remote `https://` import), Jest-ignored via `testPathIgnorePatterns`,
and CI has no Deno runtime. Its 8 fail-closed entitlement cases have never executed.

## 4. Test documentation (`CLAUDE.md:126-132`)

**Both levels remain at 0%.**

- `<module>/__tests__/README.md`: **0 of 28** folders (down from 30 — `components/devTest/__tests__`
  and `lib/devtools/__tests__` are exempt).
- `tests/<area>.md`: **0 of 14.**
- `tests/` purity: **PASS** — `README.md`, `_templates/area.md`, `_templates/module-readme.md`.
- Casing: **lowercase `tests/`**, confirmed at the NTFS-stored-name level. Matches CLAUDE.md.

**Highest-need module READMEs:**

| Folder | Files | Cases | LOC | Why |
|---|---|---|---|---|
| `context/WorkoutContext/functions/__tests__` | 12 | 236 | 4,312 | 50-case matrix; the only golden-file baselines; the only system file |
| `lib/powersync/__tests__` | 5 | 57 | 1,557 | `connector.test.ts` is 1,122 loc of mocked upload paths |
| `context/NutritionContext/functions/__tests__` | 7 | 88 | 1,148 | — |
| `lib/utils/__tests__` | 10 | 99 | 1,017 | — |
| `context/SettingsContext/functions/__tests__` | 4 | 62 | 799 | — |
| `context/SettingsContext/__tests__` | 3 | 11 | 750 | 68 loc/case — a non-obvious provider harness |

The `fatigueFunctions.baseline.test.ts` golden files are the only non-`.test` files in any
`__tests__/` folder. Nothing tells a reader what regenerating them means —
`UPDATE_FATIGUE_BASELINE=1` is discoverable only by reading the test header.

**Convention defects: one fixed, one open.**

- ~~"Area" undefined, no filename rule~~ — **fixed.** Areas are one level inside `lib/`/`context/`
  plus `shell`; the file is the folder name lowercased; the 14 are listed in `tests/README.md`.
- **No worked example — still open.** The templates are pure placeholders. The stated failure mode
  (area file decaying into a summary of the module README) is exactly what one filled-in example
  would prevent.

**The test-change rule was skipped on its first opportunity.** The whole system landed in
`f146820 "Updated progression logic (again)"` — a commit that moved 143 lines of test cases and
wrote no area file.

## 5. Logic placement (`CLAUDE.md:106`)

**16 violations across 11 files**, all in shipping code. The ~68 `components/devTest/` cases are
exempt.

**Stay in `lib/utils` — genuinely cross-domain (6):**

| Location | Function | Destination |
|---|---|---|
| `components/GraphComponents/GraphStats.tsx:33` | `computeStats` — 92 lines, 7-way branch | `lib/utils/graphStats.ts` |
| `components/GraphComponents/GraphStats.tsx:28` | `targetTone` | same |
| `components/GraphComponents/BarChart.tsx:12` / `Graph1.tsx:12` | `niceScale` / `niceStep` — same core, duplicated | `lib/utils/niceScale.ts` |
| `components/GraphComponents/ProgressWheel.tsx:13` | `lerpHex` | `lib/utils/color.ts` |
| `components/NeutralComponents/Calendar.tsx:24` | `alignYearBase` — duplicated in devTest | `lib/utils/dateHelper.ts` |

**Move to a context — single-domain (9), changed by the amendment:**

| Location | Function | Destination |
|---|---|---|
| `app/nutritionScreens/editEntry.tsx:33,38,53,66,71` | `toInputString`, `toDraft`, `toItem`, `qtyValue`, `parseEntryParam` | `context/NutritionContext/functions/` |
| `app/onboardingScreens/pace.tsx:22` **and** `app/settingsScreens/adjustNutrition/adjustNutrition2.tsx:22` | `paceLabel` — byte-identical copies | `context/SettingsContext/functions/` |
| `app/settingsScreens/adjustNutrition/adjustNutrition3.tsx:13` | `macroInitialValue` | `context/SettingsContext/functions/` |
| `components/WorkoutComponents/ProgressIndicator.tsx:40` | `weightValue` — duplicated in devTest | `context/WorkoutContext/functions/` |

**Borderline (1):** `app/(tabs)/settings.tsx:21` — `getInitials` formats auth data but is consumed
only by the settings tab. Pure string work with no domain concept, so `lib/utils` is defensible.
Pick one and note it.

**Follow-on question the amendment raises:** `paceLabel` moving to `SettingsContext` implies
`lib/utils/goalMath.ts` (`weeksToGoal`) may belong there too — same single-domain profile. Worth
deciding once rather than per-function.

**Clean:** `app/workoutScreens/` · `app/authScreens/` · `app/_layout.tsx` · `app/(tabs)/index.tsx` ·
`app/(tabs)/progress.tsx` · `components/NutritionComponents/` · `components/GuardComponents/` ·
8 of 9 `app/nutritionScreens/` · 9 of 10 `app/onboardingScreens/`

## 6. Tests before implementation (`CLAUDE.md:116`)

Unverifiable retroactively, so audited via its consequence. **~32% of `lib/`+`context/` exports are
never imported by any test; 14 modules have exports and zero tests.**

**Recent commits are direct counter-evidence:**

| Commit | Source | Tests |
|---|---|---|
| `f146820` Updated progression logic (again) | newly **exported** `getWeightIncrement`, rewritten weight-tiered rule | appears in **0** of the file's 50 cases |
| `d93ac4f` Updated progression logic | `getDailyGoal` rewritten; new `navBar` token; `ProgressIndicator.tsx` new | both untested |
| `553fdfb` Added inset hooks | `useScreenTopPad` + `useScreenBottomPad` created, 40+ consumers | **none** — all 4 older `lib/hooks/` modules have suites |
| `862eab9` Updated edge functions + OTA | 3 Edge Function bodies changed, new 65-line `fetchFoodDB/entitlement.ts` | **no CI-executed test changed** |

`553fdfb` is also why **4 suites / 11 tests are currently red** — those screens now call
`useSafeAreaInsets()` and nothing provides it under Jest.

**Highest-risk untested surface:**

- **Money:** `purchasePackage` and 4 of 7 `billingFunctions.tsx` exports — including the one that
  charges the card and the one that renders the price string
- **Conversion math:** all 6 of `unitConversions.ts` — every weight and height passes through
  these; only the *label* function is tested
- **Dates:** 9 of 16 `dateHelper.ts` exports, the most-imported utility in the codebase
- **Persistence:** `loadWorkoutData`, `loadNutritionData`, `loadSettingsAndBw`, `upsertSettings`,
  `insertLog` — only ever run as `jest.mock` stubs; the real SQL never executes
- **Startup:** `lib/env.ts` `assertRequiredEnv` — mocked in 4 suites, never actually run
- **Sync safety:** `lib/powersync/watchdogStatus.ts` (3 fns), `uploadQueueStats.ts` (2 fns) — the
  latter decides whether pending writes exist before sign-out
- **Writes:** `addNutrition`, `deleteNutrition`, `editNutrition`, `unsaveNutrition`
- Also untested whole modules: `lib/utils/dateDeserialization.ts`, `lib/utils/confirmDelete.ts`,
  `lib/notifications/permissions.ts`, `createExerciseFunctions.tsx`, `useNotificationScheduler.ts`,
  `useCombineName.ts`, 9 of 10 `ThemeContext` exports

*Dropped from this list:* `lib/devtools/forceLoadFailure.ts` — exempt.

**Edge Functions — entirely unverified by CI.** Jest ignores the directory, CI installs Node only,
and `tsconfig` can't resolve the `https://` imports. Unverified: the real paywall
(`entitlement.ts`, kept as **two byte-identical copies that must be hand-synced**, with
`ENTITLEMENT_ID = 'LiftTrition Pro'` needing to stay in sync with `billingFunctions.tsx` — nothing
enforces either); per-user/day spend caps and the 30s provider timeout in `fetchOpenAI/index.ts`;
the FatSecret OAuth token cache in `fetchFoodDB/index.ts`; and `deleteAccount/index.ts` — an
irreversible service-role delete whose reliance on `migrations/user_cascade.sql` is asserted nowhere.

---

## Cheapest high-value moves

1. **Make CI's test step blocking** — or the other rules stay optional by construction. Fix the 4
   red suites first (one `jest.mock('react-native-safe-area-context', …)` in `jest.setup.js` clears
   all 11 failures).
2. **Add one worked example** under `tests/` — the last remaining convention defect. Area
   definition and naming are now settled.
3. **Classify the 293 exports into the six logic kinds.** Nothing about coverage can be scored, and
   no spoke can be scoped, until this exists. It's also the cheapest step — a read-only pass.
4. **Write the two docs for `context/WorkoutContext/functions/__tests__`** — one module README, one
   `workoutcontext.md`. Highest complexity, and it becomes the example for the other 27 folders.
5. **Sweep the 71 forbidden citations** — mechanical regex pass (`\b[ML]\d{1,2}\b`, `audit `, `\.md`,
   `Issue \d`), highest signal per minute. Restate each as behaviour.
6. **Comment every `makeStyles`** — still the biggest single mechanical win on the comment rule.
7. **Move the 16 shipping logic functions** — kills 4 verbatim duplications (`paceLabel` ×2,
   `niceScale`/`niceStep`, `weightValue`, `alignYearBase`) as a side effect. Do this *before* test
   spokes touch `components/GraphComponents/` and `app/nutritionScreens/`.

Revised 2026-07-28 against HEAD `f146820` · 83 Jest suites · 951 cases · 940 passing
