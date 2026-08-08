# Hooks

## What was tested

The shared hook layer: timing hooks (debounced saving, the app's notion of "today"),
guard hooks (double-submit protection, async load status with retry), and the
over-the-air update applier. All are driven through null-rendering probe components
under fake timers, with the OS app-state feed, the update SDK and crash reporting faked.

**Hardest to prove:** an update finished downloading before the UI mounted still gets
applied; an offline update check quietly consumes its retry window instead of hammering
the server; the date rolls over at midnight even when the app never leaves the foreground.

## What these tests prove

- A published fix reaches a running app in the same session it is found: once the new
  bundle finishes downloading, the app restarts into it instead of waiting for the user's
  next two cold starts.
- Returning to the app re-asks the server for an update at most once per five-minute
  window; rapid app-switching never multiplies requests.
- Being offline never crashes the app, never triggers rapid retries, and never raises an
  error report — the app just keeps running the bundle it has.
- Update behaviour is fully inert in development builds and Expo Go.
- Double-tapping a submit button runs the action exactly once.
- Pausing while typing saves once with the final value; dismissing a screen mid-edit still
  saves the draft; a value never touched never saves.
- A screen knows whether its data load is pending, done, or failed, and a failed load can
  be retried.
- "Today" rolls over at local midnight — including across DST — whether the app stays
  open or returns from the background.

## Not proven

- Nothing pins *when* the update restart happens: it can interrupt whatever the user is
  doing at that moment, and unsaved form state is lost. Concretely, a restart that lands
  mid-photo-analysis abandons that in-flight AI call outright — the request already sent
  (and billed) gets no reader, nothing is logged, and no error is shown to the user.
  Deliberate trade-off, no gating on in-flight work, no test.
- The real update SDK's native behaviour (download events, rollbacks, what counts as
  "pending") is faked; only this app's reaction to it is proven.
- The safe-area padding hooks have no tests.

Area: lib/hooks · 38 cases · reviewed 2026-08-01
