# Load-Failure Retry & Race Guard (Audit Issue 6) — Design

**Date:** 2026-07-14
**Status:** Approved in conversation 2026-07-14
**Source:** `docs/AUDIT_MAJOR.txt` issue 6 PLAN + F6a/F6b

## Problem

When a context's initial load fails, the catch block writes blank defaults
and sets `loaded = true` — indistinguishable from a brand-new user. The
route guard then sends an existing, onboarded user to onboarding; if they
complete it, their real goals/macros overwrite the server copy. The
catch-and-pretend pattern is copy-pasted in Settings, Nutrition, Workout,
and PowerSyncGuard. None of the three context load effects has stale-load
protection either: on a `userID` change mid-load, an in-flight load can
resolve late and clobber the new user's state (today only incidentally
absorbed by PowerSync teardown + screen unmount).

## Decision

Make a failed load a distinct, recoverable state instead of a silent
disguise. Centralize the load lifecycle (status machine + retry + race
guard) in one hook; each context keeps its own loader body (Shape A).
Surface failure on the existing loading screen (Quiet-line variant), not a
separate error screen.

Alternatives considered and rejected:
- **Separate `LoadErrorScreen`** — heavier; the loading screen is already
  the render-gate, so an error *variant* of it is less code and no jarring
  swap. (Also the earlier infinite-spinner idea: rejected because a
  persistent failure would brick the app with no exit — see conversation.)
- **Shape B (hook owns the data)** — cleaner race guard, but the contexts
  each set several state atoms; threading a composite through is more churn
  than Shape A's one `if (isStale()) return` line per loader.

## Design

### Part 1 — `useAsyncLoad` hook (new, `lib/hooks/useAsyncLoad.ts`)

```ts
type LoadStatus = 'loading' | 'ready' | 'error'
useAsyncLoad(
  loader: (isStale: () => boolean) => Promise<void>,
  deps: DependencyList,
): { status: LoadStatus; retry: () => void }
```

- `status` starts `'loading'`; set `'loading'` at the top of every run
  (mount, deps change, retry); `'ready'` on resolve; `'error'` on reject.
- `retry()` bumps an internal nonce included in the effect deps, re-running
  the loader.
- **Race guard:** each effect run owns a `cancelled` flag; cleanup sets it
  true. Status writes are gated `if (!cancelled)`. The loader receives
  `isStale = () => cancelled` so it can bail before writing data
  (`if (isStale()) return`) — guarding the data writes, not just status.
- On reject, `console.warn` (matches codebase pattern); Sentry left to F6c.

### Part 2 — contexts adopt it (Settings, Nutrition, Workout)

Each context's load effect collapses to `useAsyncLoad(loader, [userID])`
around its existing loader body. Changes:
- Delete the catch-and-pretend block (on error, write nothing — prior state
  stays).
- Keep the `if (!userID)` empty-state branch inside the loader (valid ready
  state, `return`).
- Add `if (isStale()) return` after the awaited load, before the setters.
- Derive `loaded = status === 'ready'`; expose `loadFailed = status ===
  'error'` and `retryLoad = retry` on the context interface (update each
  `types.ts`).
- Preserve existing pre-load side effects (Settings' `setPersistDirty(false)`
  etc.).

### Part 3 — `AppLoadingScreen` Quiet-line error variant

New optional props `loadFailed?: boolean` and `onRetry?: () => void`. When
`loadFailed`, the caption becomes "Having trouble loading your data" and a
tinted uppercase "Tap to retry" link fades in beneath (same fade+rise the
caption uses), wired to `onRetry`; spinner keeps running. Reverts to the
plain caption while retrying. Matches the Quiet-line variant validated in
Dev Hub (Archivo).

### Part 4 — `_layout.tsx` StackLayout wiring

Read each context's `loadFailed` + `retryLoad`. Aggregate
`anyLoadFailed = settingsFailed || nutritionFailed || workoutFailed`
(Billing is excluded — it intentionally continues without premium on
failure per CLAUDE.md gotcha 6, so it never reports loadFailed) and a
combined `retryAll` that re-runs whichever failed. The existing
`!allContextsLoaded` branch already keeps `AppLoadingScreen` mounted with
the Stack unmounted; pass `loadFailed={anyLoadFailed}` and
`onRetry={retryAll}` into it. Onboarding is unreachable from an error state
by construction (Stack unmounted).

### Part 5 — PowerSyncGuard

Give its `waitForFirstSync` catch the same error-state treatment: on
failure show `AppLoadingScreen` with the retry affordance (loader =
`() => powerSync.waitForFirstSync()`), instead of `setPowerSyncReady(true)`
"continue anyway".

### Safety that falls out (issue 6 step 3)

Persist effects key on `loaded`/`hasLoadedUserData`; an errored context
never reaches `ready`, so the save path never runs in an error state — the
overwrite becomes structurally impossible, not merely guarded.

## Testing

- **`useAsyncLoad`** (TDD, `lib/hooks/__tests__/useAsyncLoad.test.tsx`,
  react-test-renderer): loading while pending; resolve→ready; reject→error;
  retry re-runs; deps-change re-runs; `isStale()` true for a superseded run;
  a superseded run's rejection does not flip status to error. (Test drafted
  ahead of this spec; will run red→green in the plan's first step.)
- **Context wiring:** verified by typecheck + existing context-function
  suites + the hook tests; provider-render tests are out of scope (codebase
  has no provider-render test precedent).
- **Manual (owner):** force `loadSettingsAndBw` to throw once → loading
  screen shows "tap to retry", NOT onboarding; retry succeeds → tabs with
  real data; fresh account still onboards.

## Out of scope

F6c (`reportPersistFailure`, issue 17), Sentry wiring for load errors,
provider-render test harness, extracting a shared `usePowerSyncLoad` loader
factory (revisit if a 4th PowerSync context appears).

## Files

New: `lib/hooks/useAsyncLoad.ts` (+ test). Modified: `AppLoadingScreen.tsx`,
Settings/Nutrition/Workout `index.tsx` + `types.ts`, `PowerSyncGuard.tsx`,
`app/_layout.tsx`.
