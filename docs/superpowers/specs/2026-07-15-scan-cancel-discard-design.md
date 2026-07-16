# Scan Cancel — Discard the Result on Swipe (AUDIT_MAJOR issue 13)

**Date:** 2026-07-15
**Status:** Approved (silent swipe-cancel chosen in conversation)

## Problem

Swiping away the "Analyzing..." modal cancels nothing. The AI call keeps
running; up to 30s later it adds the meal anyway, fires `router.dismissAll()`
from wherever the user has since navigated, or pops a failure alert over an
unrelated screen. Re-taking the photo after a "cancel" produces duplicate
meals and duplicate paid AI calls.

## Decision

Keep the modal and keep swipe-to-dismiss enabled. A swipe (or Android back)
during analysis means **cancel: silently discard the in-flight result** — no
meal committed, no persist, no alert, no navigation side effects. A canceled
scan makes zero noise, even if the analysis later fails.

Explicitly rejected/deferred:
- **Block the swipe** (the issue's original PLAN: `gestureEnabled: false` +
  `usePreventRemove` + doneRef): keeps the user hostage for 30s and
  `usePreventRemove` is used nowhere in the codebase.
- **Remove the modal entirely** (pending loading rows in the log list):
  designed in full during brainstorming but deferred — iOS background
  suspension makes fire-and-forget scans less reliable, and the modal keeps
  the affordance honest. May be revisited later.
- **Abort the network call** (`AbortController` threading): real plumbing
  through `askOpenAIVision` → edge function → FatSecret enrichment for
  marginal payoff — the server-side OpenAI call bills regardless. We discard
  the *result*, not the request. A canceled scan still costs one AI call.

## Design

The seam already exists: `analyzeAndAddPhoto` **computes** via
`runPhotoAnalysis` (no state write) and only then **commits** via
`addNutrition` (context/NutritionContext/functions/aiFunctions.tsx).

1. **`analyzeAndAddPhoto`** gains an optional `shouldCommit?: () => boolean`,
   checked between compute and commit. False → return `null`: no
   `addNutrition`, nothing for the caller to persist. Return type becomes
   `Promise<NutritionEntry | null>`.
2. **`handleAnalyzeAndAddPhoto`** (context) passes it through and early
   returns on `null` (skips `upsertNutritionEntry`).
3. **`analyzingModal.tsx`** holds `canceledRef`, set by a
   `navigation.addListener('beforeRemove', ...)` (the established pattern —
   see subscription.tsx; covers iOS swipe AND Android back). It threads
   `() => !canceledRef.current` as `shouldCommit` and guards both
   continuations: success skips `dismissAll()` when canceled; the catch
   skips the failure Alert when canceled.

Why this is race-free: the guard is evaluated when the await resolves, so a
swipe at any point during the 30s lands as `canceled === true` by commit
time. On the success path, `dismissAll()` itself fires `beforeRemove` — but
that sets the ref *after* commit and nothing reads it afterward.

## Dev Hub harness

Dev Hub → Nutrition AI → "Scan Cancel (Issue 13)" launches the **real**
modal with a fake analysis (no API call, nothing saved): route params
`devFakeMs` (delay) + `devFakeOutcome` (success|fail), consumed by a
`__DEV__`-guarded branch inside `analyzePhoto` (Metro strips it from
production). Observable pass/fail: with guards working, swipe → silence;
broken guards would visibly `dismissAll` to tabs or pop an orphan alert —
the exact issue-13 symptom. Launcher: `components/devTest/ScanCancelTest.tsx`
(delay + outcome Segmented controls, bundled meal.jpg via expo-asset).

## Testing

New `context/NutritionContext/functions/__tests__/aiFunctions.test.ts`
(aiFunctions has no tests today). Mock leaf deps per-file (expo-file-system
`File`, `@/lib/openAI/openAI`, `@/lib/foodDB/foodDB`, react-native-uuid);
`addNutrition` runs real (setter-only). Cases:

1. shouldCommit false at resolution (deferred vision promise, canceled
   mid-flight) → resolves `null`, setter never called. **The core assertion.**
2. shouldCommit true → commits once; entry carries `isPhoto` + the passed date.
3. shouldCommit omitted → commits (existing callers unchanged).
4. Analysis failure → still throws, never commits.

Modal wiring is verified on the simulator via the Dev Hub page (swipe
mid-delay → silence; no-swipe success → dismissAll; no-swipe fail → alert on
the modal) plus one real-scan device pass.

## Out of scope

- Aborting/refunding the in-flight AI call.
- Durable/resumable scans (surviving app kill mid-analysis).
- The unified camera scan screen rework (separate in-flight plan; this
  change does not touch cameraScreen.tsx).
