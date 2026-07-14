# Load-Failure Retry & Race Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a failed context load a distinct, recoverable state so an existing user is never dumped into onboarding (and never overwrites their real profile), via a shared `useAsyncLoad` hook with a stale-load race guard.

**Architecture:** One new hook owns the load lifecycle (status machine + retry + cancelled/isStale race guard). Settings/Nutrition/Workout adopt it (Shape A: loader keeps its own setState, adds `if (isStale()) return` before writes) and expose `loadFailed`/`retryLoad`. `AppLoadingScreen` gains a Quiet-line error variant; `StackLayout` aggregates failures into it; `PowerSyncGuard` gets the same error state.

**Tech Stack:** React 19, TypeScript, Expo Router, PowerSync, Jest + react-test-renderer.

## Global Constraints

- No new dependencies. Test rendering uses `react-test-renderer` (only React renderer installed).
- Match existing style: `console.warn` for caught errors; theme tokens from `@/context/ThemeContext` (`useColors`, `fonts`); no hardcoded hexes.
- **Git commits are DEFERRED per the user's standing instruction ("don't commit, just implement").** Each task ends with a typecheck/test checkpoint instead of a commit. Do not run `git commit`.
- Billing is excluded from failure aggregation (it intentionally continues without premium — CLAUDE.md gotcha 6).

---

### Task 1: `useAsyncLoad` hook

**Files:**
- Create: `lib/hooks/useAsyncLoad.ts`
- Test: `lib/hooks/__tests__/useAsyncLoad.test.tsx` (already drafted this session)

**Interfaces:**
- Produces: `type LoadStatus = 'loading' | 'ready' | 'error'` and `useAsyncLoad(loader: (isStale: () => boolean) => Promise<void>, deps: DependencyList): { status: LoadStatus; retry: () => void }`

- [ ] **Step 1: Run the drafted test to verify it fails (module missing)**

Run: `npx jest lib/hooks/__tests__/useAsyncLoad.test.tsx`
Expected: FAIL — "Cannot find module '../useAsyncLoad'".

- [ ] **Step 2: Implement the hook**

```tsx
// lib/hooks/useAsyncLoad.ts
import { useCallback, useEffect, useState, type DependencyList } from 'react'

export type LoadStatus = 'loading' | 'ready' | 'error'

/**
 * Runs an async loader as an effect and tracks its lifecycle as an explicit
 * status. The loader performs its own side effects (writing context state);
 * this hook owns status + retry, so a FAILED load is a distinct 'error' state
 * instead of being indistinguishable from success. Re-runs on deps change or
 * retry(). A run whose deps changed mid-flight is ignored (cancelled flag), and
 * the loader is handed isStale() so it can bail before writing stale data.
 */
export function useAsyncLoad(
    loader: (isStale: () => boolean) => Promise<void>,
    deps: DependencyList,
): { status: LoadStatus; retry: () => void } {
    const [status, setStatus] = useState<LoadStatus>('loading')
    const [nonce, setNonce] = useState(0)

    const retry = useCallback(() => setNonce((n) => n + 1), [])

    useEffect(() => {
        let cancelled = false
        setStatus('loading')

        loader(() => cancelled)
            .then(() => {
                if (!cancelled) setStatus('ready')
            })
            .catch((e) => {
                if (!cancelled) {
                    console.warn('[useAsyncLoad] load failed', e)
                    setStatus('error')
                }
            })

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce])

    return { status, retry }
}
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `npx jest lib/hooks/__tests__/useAsyncLoad.test.tsx`
Expected: PASS — 7 tests. Output pristine (console.warn is spied/silenced in the test).

- [ ] **Step 4: Checkpoint** — `npx tsc --noEmit` shows no new errors in `lib/hooks/`.

---

### Task 2: SettingsContext adopts the hook

**Files:**
- Modify: `context/SettingsContext/index.tsx` (imports; remove `loaded` state line 33; replace load effect 84-119; provider value 159-171)
- Modify: `context/SettingsContext/types.ts` (interface)

**Interfaces:**
- Consumes: `useAsyncLoad` from Task 1.
- Produces: `SettingsContextInterface` gains `loadFailed: boolean` and `retryLoad: () => void`.

- [ ] **Step 1: Add the import**

Add to the top of `context/SettingsContext/index.tsx`:
```tsx
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
```

- [ ] **Step 2: Remove the standalone `loaded` state**

Delete line 33: `const [loaded, setLoaded] = useState(false)`

- [ ] **Step 3: Replace the load effect (lines 84-119) with the hook**

```tsx
    // Load from PowerSync via the shared status hook (Task 1).
    const { status: loadStatus, retry: retryLoad } = useAsyncLoad(async (isStale) => {
        setHasLoadedUserData(false)
        setPersistDirty(false)
        if (!userID) {
            setSettingsState(defaultSettings)
            setBwProgressState({})
            return
        }
        await powerSync.waitForFirstSync()
        const { settings, bwProgress, hasData } = await loadSettingsAndBw(userID)
        if (isStale()) return
        setSettingsState(settings)
        setBwProgressState(bwProgress)
        setHasLoadedUserData(hasData)
    }, [userID])

    const loaded = loadStatus === 'ready'
    const loadFailed = loadStatus === 'error'
```

- [ ] **Step 4: Expose the new fields in the provider value (object at 159-171)**

Add `loadFailed,` and `retryLoad,` after `loaded,` in the `value={{ ... }}` object.

- [ ] **Step 5: Add to the interface** in `context/SettingsContext/types.ts` after `loaded: boolean;`:
```tsx
    loadFailed: boolean;
    retryLoad: () => void;
```

- [ ] **Step 6: Checkpoint** — `npx tsc --noEmit` clean for SettingsContext; `npx jest context/SettingsContext` still passes.

---

### Task 3: NutritionContext adopts the hook

**Files:**
- Modify: `context/NutritionContext/index.tsx` (imports; remove `loaded` state line 29; replace load effect 37-62; value useMemo 135-153)
- Modify: `context/NutritionContext/types.ts`

**Interfaces:**
- Consumes: `useAsyncLoad` from Task 1.
- Produces: `NutritionContextInterface` gains `loadFailed: boolean` and `retryLoad: () => void`.

- [ ] **Step 1: Add the import** to `context/NutritionContext/index.tsx`:
```tsx
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
```

- [ ] **Step 2: Remove line 29** `const [loaded, setLoaded] = useState(false);`

- [ ] **Step 3: Replace the load effect (lines 37-62) with the hook**

```tsx
    // Load from PowerSync whenever the user changes (shared status hook, Task 1).
    const { status: loadStatus, retry: retryLoad } = useAsyncLoad(async (isStale) => {
        if (!userID) {
            setNutritionData([]);
            setSavedNutritionEntries([]);
            return;
        }
        await powerSync.waitForFirstSync();
        const { nutritionData, savedNutritionEntries } = await loadNutritionData(userID);
        if (isStale()) return;
        setNutritionData(nutritionData);
        setSavedNutritionEntries(savedNutritionEntries);
    }, [userID]);

    const loaded = loadStatus === 'ready';
    const loadFailed = loadStatus === 'error';
```

- [ ] **Step 4: Add to the value useMemo (135-153)** — add `loadFailed,` and `retryLoad,` after `loaded,` in the returned object AND add `loadFailed, retryLoad` to the dependency array on line 153.

- [ ] **Step 5: Add to the interface** in `context/NutritionContext/types.ts` after `loaded: boolean`:
```tsx
    loadFailed: boolean
    retryLoad: () => void
```

- [ ] **Step 6: Checkpoint** — `npx tsc --noEmit` clean for NutritionContext; `npx jest context/NutritionContext` still passes.

---

### Task 4: WorkoutContext adopts the hook

**Files:**
- Modify: `context/WorkoutContext/index.tsx` (imports; remove `loaded` state line 40; replace load effect ~514-547; provider value 566-606)
- Modify: `context/WorkoutContext/types.ts`

**Interfaces:**
- Consumes: `useAsyncLoad` from Task 1.
- Produces: `WorkoutContextInterface` gains `loadFailed: boolean` and `retryLoad: () => void`.

- [ ] **Step 1: Add the import** to `context/WorkoutContext/index.tsx`:
```tsx
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
```

- [ ] **Step 2: Remove line 40** `const [loaded, setLoaded] = useState(false)`

- [ ] **Step 3: Replace the load effect (the `useEffect` with the `if (!userID)` reset + `loadWorkoutData`, ~514-547) with the hook**

```tsx
    // Load from PowerSync when the user changes (shared status hook, Task 1).
    const { status: loadStatus, retry: retryLoad } = useAsyncLoad(async (isStale) => {
        if (!userID) {
            setWorkoutsState([])
            setExercisesState([])
            setLogsState([])
            setUserExercisesState({})
            return
        }
        await powerSync.waitForFirstSync()
        const { workouts: w, exercises: e, logs: l, userExercises: u } = await loadWorkoutData(userID)
        if (isStale()) return
        setWorkoutsState(w)
        setExercisesState(e)
        setLogsState(l)
        setUserExercisesState(u)
    }, [userID])

    const loaded = loadStatus === 'ready'
    const loadFailed = loadStatus === 'error'
```

- [ ] **Step 4: Expose the new fields in the provider value (566-606)** — add `loadFailed,` and `retryLoad,` after `loaded,`.

- [ ] **Step 5: Add to the interface** in `context/WorkoutContext/types.ts` after `loaded: boolean`:
```tsx
    loadFailed: boolean
    retryLoad: () => void
```

- [ ] **Step 6: Checkpoint** — `npx tsc --noEmit` clean for WorkoutContext; `npx jest context/WorkoutContext` still passes.

---

### Task 5: AppLoadingScreen Quiet-line error variant

**Files:**
- Modify: `components/GuardComponents/AppLoadingScreen.tsx` (Props type 6-8; component signature 14; `display` const 71; JSX after the message Text ~88-90; `makeStyles` ~148-154)

**Interfaces:**
- Produces: `AppLoadingScreen` accepts optional `loadFailed?: boolean` and `onRetry?: () => void`.

- [ ] **Step 1: Extend Props and the signature**

Replace the `type Props` block (lines 6-8) and function signature (line 14):
```tsx
type Props = {
    message?: string
    loadFailed?: boolean
    onRetry?: () => void
}
```
```tsx
export function AppLoadingScreen({ message = 'Loading your profile...', loadFailed = false, onRetry }: Props) {
```

- [ ] **Step 2: Import Text + TouchableOpacity**

Change the `react-native` import (line 4) to include `Text` and `TouchableOpacity`:
```tsx
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
```

- [ ] **Step 3: Swap the caption text when failed** — replace line 71:
```tsx
    const display = loadFailed ? 'Having trouble loading your data' : message.replace(/[.…]+$/, '')
```

- [ ] **Step 4: Add the retry link after the message `<Animated.Text>`** (after line 90, before closing `</View>`):
```tsx
            {loadFailed && onRetry && (
                <Animated.View style={{ opacity: messageIn, transform: [{ translateY: messageRise }] }}>
                    <TouchableOpacity onPress={onRetry} activeOpacity={0.7} hitSlop={10}>
                        <Text style={styles.retryLink}>Tap to retry</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
```

- [ ] **Step 5: Add the `retryLink` style** in `makeStyles`, after the `message` style:
```tsx
        retryLink: {
            color: colors.workout,
            fontSize: 12.5,
            fontFamily: fonts.semibold,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            marginTop: 12,
        },
```

- [ ] **Step 6: Checkpoint** — `npx tsc --noEmit` clean for AppLoadingScreen.

---

### Task 6: Wire StackLayout route guard

**Files:**
- Modify: `app/_layout.tsx` (import `useCallback`; StackLayout body 111-126)

**Interfaces:**
- Consumes: `loadFailed`/`retryLoad` from Tasks 2-4; `loadFailed`/`onRetry` props from Task 5.

- [ ] **Step 1: Add `useCallback` to the React import** (line 19):
```tsx
import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react'
```

- [ ] **Step 2: Replace the context reads + loading branch (lines 112-126)**

```tsx
    const { session } = useAuth()
    const { settings, loaded: settingsLoaded, loadFailed: settingsFailed, retryLoad: retrySettings } = useSettings()
    const { loaded: nutritionLoaded, loadFailed: nutritionFailed, retryLoad: retryNutrition } = useNutrition()
    const { loaded: workoutLoaded, loadFailed: workoutFailed, retryLoad: retryWorkout } = useWorkout()
    const { loaded: billingLoaded } = useBilling()
    const colors = useColors()
    const allContextsLoaded = settingsLoaded && nutritionLoaded && workoutLoaded && billingLoaded
    const anyLoadFailed = settingsFailed || nutritionFailed || workoutFailed

    const retryAll = useCallback(() => {
        if (settingsFailed) retrySettings()
        if (nutritionFailed) retryNutrition()
        if (workoutFailed) retryWorkout()
    }, [settingsFailed, nutritionFailed, workoutFailed, retrySettings, retryNutrition, retryWorkout])

    if (!allContextsLoaded) {
        return (
            <AppColumn>
                <AppLoadingScreen loadFailed={anyLoadFailed} onRetry={retryAll} />
            </AppColumn>
        )
    }
```

- [ ] **Step 3: Checkpoint** — `npx tsc --noEmit` clean for `app/_layout.tsx`.

---

### Task 7: PowerSyncGuard error/retry treatment

**Files:**
- Modify: `components/GuardComponents/PowerSyncGuard.tsx` (whole component)

**Interfaces:**
- Consumes: `useAsyncLoad` from Task 1; `AppLoadingScreen` error props from Task 5.

- [ ] **Step 1: Replace the component body** so `waitForFirstSync` failure shows the retry state instead of "continue anyway":

```tsx
import { useAuth } from '@/context/AuthContext'
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
import { powerSync } from '@/lib/powersync/system'
import React from 'react'
import { AppLoadingScreen } from './AppLoadingScreen'

type Props = {
    children: React.ReactNode
}

export function PowerSyncGuard({ children }: Props) {
    const { session, loading: authLoading } = useAuth()

    const { status, retry } = useAsyncLoad(async () => {
        if (!session) return
        await powerSync.waitForFirstSync()
    }, [session, authLoading])

    if (authLoading || status !== 'ready') {
        return (
            <AppLoadingScreen
                message="Syncing data..."
                loadFailed={!authLoading && status === 'error'}
                onRetry={retry}
            />
        )
    }

    return <>{children}</>
}
```

- [ ] **Step 2: Checkpoint** — `npx tsc --noEmit` clean for PowerSyncGuard.

---

### Task 8: Full verification

- [ ] **Step 1: Typecheck** — `npx tsc --noEmit` — no errors in any file touched by Tasks 1-7 (pre-existing Deno edge-function + WIP-branch errors excluded).
- [ ] **Step 2: Full suite** — `npx jest` — `useAsyncLoad` suite passes; no suite that passed before this plan now fails (compare against the known-red baseline on this branch).
- [ ] **Step 3: code-simplifier** — run the code-simplifier agent over the touched files; apply safe simplifications; re-run typecheck + hook tests.
- [ ] **Step 4: Manual (owner, on simulator)** — temporarily make `loadSettingsAndBw` throw once → loading screen shows "Tap to retry" (NOT onboarding); tap retry → tabs with real data; revert the throw; fresh account still onboards normally.

## Self-Review

- **Spec coverage:** Part 1 → Task 1; Part 2 → Tasks 2-4; Part 3 → Task 5; Part 4 → Task 6; Part 5 → Task 7; step-3 persistence safety is automatic (derived `loaded` never `ready` on error, verified by the persist effects being unchanged). Manual + suite → Task 8. No gaps.
- **Placeholder scan:** none — every code step shows full code.
- **Type consistency:** `loadFailed: boolean` + `retryLoad: () => void` used identically across Tasks 2-5; `LoadStatus`/`useAsyncLoad` signature matches Task 1; `loadFailed`/`onRetry` props match between Task 5 (definition) and Tasks 6-7 (consumption).
