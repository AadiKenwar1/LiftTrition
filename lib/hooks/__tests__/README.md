# lib/hooks tests

## Logic kind

State & concurrency throughout — every hook here is modes, transitions and races
(debounce timing, in-flight guards, load status, day rollover, update apply/check).
`useOTAUpdates` additionally carries a persistence & integration failure surface: the three
expo-updates SDK calls (check, fetch, reload) each get their rejection case, per that kind's
"failure matrix over happy paths" bar.

## Harness

Null-rendering probe components mount the hook under react-test-renderer's `create`/`act`;
the probe either exposes the hook's return through a captured variable (`useAsyncLoad`,
`useSubmitOnce`) or the test observes side effects on mocks (`useDebouncedSave`, `useToday`,
`useOTAUpdates`). Timing-sensitive suites run fake timers, plus `jest.setSystemTime` where
wall-clock position matters (midnight rollover, throttle windows). AppState is stubbed two
ways: a spy on the real module (`useToday`) or a minimal `react-native` module mock exposing
only `AppState` (`useOTAUpdates`, same seam as SyncWatchdog.test).

## Fixtures

None shared — these hooks take primitives and callbacks, so each file builds its own
`jest.fn()`s. `useOTAUpdates` mocks `expo-updates` and `@sentry/react-native` locally; the
expo-updates mock defers every property lazily because the hoisted factory runs before the
file's consts initialise.

## Non-obvious cases

- `useOTAUpdates` runs with `__DEV__` forced to `false` in `beforeEach`: jest-expo sets it
  true, but the hook is a release-build feature and would no-op every case. The dev-disabled
  case flips it back to true explicitly.
- Mount counts as an update check — the native cold-boot check has just run — so a foreground
  immediately after mount asserting *no* server call is correct, not a gap.
- A failed (offline) check still consumes the throttle window: the retry case expects the
  second attempt only after another full window, and expects no Sentry error event — offline
  foregrounds are routine.
- `WINDOW_MS` in the OTA test mirrors the hook's private constant as a deliberate literal, so
  changing the throttle breaks a test instead of silently drifting.
- The in-flight race case holds `checkForUpdateAsync` pending via a manually-resolved promise
  and fires two AppState transitions inside one synchronous `act`, proving the throttle ref is
  written before the await (not after) — every other OTA case settles its mocks immediately, so
  this is the one place mock timing is deliberately controlled by hand.
- `useToday` schedules midnight by wall-clock construction (+1s buffer) so DST transitions
  land on the real next midnight; the rollover-without-foreground case advances timers, never
  fires AppState.
- `useDebouncedSave` flushes the latest unsaved value on unmount — dismissal mid-edit is a
  save, not a drop — but a value still at its initial never saves.

## Known gaps

- The safe-area padding hooks (`useScreenTopPad`, `useScreenBottomPad`) have no tests —
  thin `useSafeAreaInsets` arithmetic wrappers; deliberate.
- `useOTAUpdates` proves this app's reaction to a mocked expo-updates surface, not the real
  native update state machine (download events, rollbacks, `isUpdatePending` semantics).
- No case pins *when* a reload is safe to fire: an update landing mid-session reloads the app
  wherever the user is, losing transient form state. Accepted trade-off, documented in
  `tests/hooks.md` as unproven.
