# Scan Cancel Discard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swiping away (or Android-backing out of) the Analyzing modal silently discards the in-flight AI result — no meal committed, no persist, no alert, no navigation side effects.

**Architecture:** An optional `shouldCommit?: () => boolean` gate in `analyzeAndAddPhoto`, checked between compute (`runPhotoAnalysis`) and commit (`addNutrition`), threaded from the modal's `canceledRef` (set by a `beforeRemove` listener). The network call is not aborted — its result is discarded.

**Tech Stack:** React Native / Expo 54, expo-router native stack, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-07-15-scan-cancel-discard-design.md`

## Global Constraints

- **Do NOT run any git commands** — the user owns all version control.
- Test command: `npm run test:ci -- <pattern>` (`npm test` is watch mode — never use it).
- Baselines: ~6 pre-existing failing suites and 28 pre-existing `tsc` errors are out of scope; only touched files must be clean.
- Comments only when non-obvious.
- Swipe stays enabled (`gestureEnabled: true` via `modalPresentation`) — no route-option changes.

---

### Task 1: shouldCommit gate (TDD)

**Files:**
- Create: `context/NutritionContext/functions/__tests__/aiFunctions.test.ts`
- Modify: `context/NutritionContext/functions/aiFunctions.tsx` (analyzeAndAddPhoto)
- Modify: `context/NutritionContext/index.tsx:128-136` (handleAnalyzeAndAddPhoto)
- Modify: `context/NutritionContext/types.ts:51` (interface signature)

**Interfaces:**
- Produces: `analyzeAndAddPhoto(photoUri, userID, setNutritionData, date?, mode?, shouldCommit?): Promise<NutritionEntry | null>`; `handleAnalyzeAndAddPhoto(photoUri, userID, mode?, shouldCommit?): Promise<void>`.

- [ ] **Step 1: Write the failing test** — full code in the session plan (4 cases: discard mid-flight → null + no setter; commit on true; commit when omitted; failure still throws). Mocks: expo-file-system `File` (named), `@/lib/openAI/openAI`, `@/lib/foodDB/foodDB`, react-native-uuid (`__esModule: true, default`).
- [ ] **Step 2: Run** `npm run test:ci -- aiFunctions` — expect FAIL on test 1 (6th arg ignored today, so it commits and resolves non-null).
- [ ] **Step 3: Implement** — add the param + `if (shouldCommit && !shouldCommit()) return null;` before `addNutrition`; pass-through + `if (!entry) return;` in the context; widen the interface signature.
- [ ] **Step 4: Run** `npm run test:ci -- aiFunctions` — expect PASS (4 tests).

### Task 2: Modal wiring

**Files:**
- Modify: `app/nutritionScreens/analyzingModal.tsx`

- [ ] Add `useNavigation` (expo-router) + `useRef` (react) imports; `canceledRef`; `beforeRemove` listener effect (pattern: subscription.tsx:39-45).
- [ ] `analyzePhoto`: pass `() => !canceledRef.current`; guard `router.dismissAll()` and the failure Alert with `if (canceledRef.current) return`.
- [ ] Add the `__DEV__` fake branch (`devFakeMs`/`devFakeOutcome` params → fake delay / forced failure, no API call).

### Task 3: Dev Hub harness

**Files:**
- Create: `components/devTest/ScanCancelTest.tsx` (launcher: delay + outcome Segmented, bundled meal.jpg, pushes the real modal with dev params)
- Create: `app/devTest/scanCancel.tsx` (`__DEV__` require stub, pattern: app/devTest/aiTest.tsx)
- Modify: `app/_layout.tsx` (register `devTest/scanCancel`)
- Modify: `components/devTest/DevHub.tsx` (Nutrition AI group entry "Scan Cancel (Issue 13)")

### Task 4: Verification + docs

- [ ] `npm run test:ci -- "context/NutritionContext"` — no new failures.
- [ ] `npx tsc --noEmit` — no errors in touched files; total ≤ 28 baseline.
- [ ] code-simplifier scoped ONLY to the changed files (working tree has unrelated in-flight streams). Re-run checks after.
- [ ] Move issue 13 from `docs/AUDIT_MAJOR.txt` into `docs/COMPLETED_ISSUES.txt` **in issue-number order** (before issue 15), add `13` to the header's migrated list, append the `Completed 2026-07-15:` postscript documenting the deviation from the original PLAN (silent swipe-cancel instead of block-the-swipe; result discarded, call still bills; Dev Hub companion tool).
- [ ] Report the manual checklist (simulator Dev Hub passes + one real-scan device pass).
