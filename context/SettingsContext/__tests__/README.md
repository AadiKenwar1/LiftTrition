# SettingsContext provider tests

## Logic kind

**State & concurrency.** Every file here drives `SettingsProvider` through transitions rather than
checking return values, so the bar is transition coverage — states × events, including the events
that must be refused — not a case count.

- `index.persist.test.tsx` — the C3 mutex wedge: a mutation landing mid-save cancels the running
  effect, and the save mutex must still be released.
- `persistEffect.test.tsx` — the consecutive-failure alert threshold, the onboarding
  "keep retrying past the alert" branch, and the rollback-vs-new-edit race in `reloadFromDisk`.
- `providerMemo.test.tsx` — the value memo: an internal save-cycle pass must not churn the
  context reference, a real mutation must.
- `goalPrompt.test.tsx` — which weigh-ins raise the goal-reached prompt.

Pure helpers those tests lean on (`computeBwUpdate`, `isGoalReached`, `shouldPromptGoalReached`,
`applySwitchToMaintenance`, `calculateMacros`, the validators) are tested separately in `../functions/__tests__/`.

## Harness

`react-test-renderer` renders `<SettingsProvider>` around a `Probe` that assigns the context value to
a module-level `latest` on every render; assertions read `latest` after an `act`. Four mocks, shared
across the files:

- **`@/context/AuthContext`** — `useAuth` stubbed to a constant signed-in `'user-1'`, so the loader
  runs deterministically.
- **`@/lib/powersync/system`** — `powerSync.waitForFirstSync` resolves immediately.
- **`@sentry/react-native`** — mocked defensively; `persistErrors` imports it at module top, and
  importing it for real would reach the native SDK.
- **`../database/powersyncStore`** — `loadSettingsAndBw` / `upsertSettings` / `upsertWeightForDate`
  as `jest.fn()`s. The load mock is how each test seeds its starting state.

`goalPrompt.test.tsx` adds a `seed(overrides)` helper that points the mocked cold load at
`{ ...DEFAULT_SETTINGS, ...overrides }` — every test starts from an explicit goal state rather than
mutating its way there.

## Non-obvious cases

- **`commitGoalAndWeighIn` is the whole point of `goalPrompt.test.tsx`.** It calls `setSettings` and
  then `handleUpdateBw` inside ONE `act`, reproducing what the onboarding goal screen's `handleNext`
  does. That ordering matters twice over: the queued updaters apply in order, so the weigh-in builds
  on the goal fields; and `handleUpdateBw` is still the callback from the pre-commit render, so
  anything it reads out of its own closure is one render stale. Both same-tick cases were written red
  — they are the reason the prompt is decided by an effect keyed on `weighInSeq` instead of inside
  `handleUpdateBw`.
- **`commitWeighInThenGoal` is the mirror-image order**, used by the adjustNutrition wizard's
  `handleSave` (weight is editable on its step 1, so a changed one is logged as a weigh-in before the
  wizard's own goal/macro commit lands). `handleUpdateBw`'s queued update is built from the pre-commit
  closure and is always fully superseded by the literal commit right behind it — the cases in "weigh-in
  fired before the goal commit" pin that the prompt, the saved fields, and the bwProgress/DB write all
  still land correctly with the order flipped, not just with `commitGoalAndWeighIn`'s order.
- **The two same-tick cases fail in opposite directions.** "reaches a goal committed in the SAME tick"
  catches the false negative (the closure still says `maintain`, which can never be reached);
  "moves the goal out of reach in the SAME tick" catches the false positive (the closure still holds
  the old, easier goal). One alone would not have pinned the bug.
- **"loading an already-at-goal user does not raise the prompt"** asserts an *absence*, and it is what
  stops the obvious simplification. Drop `weighInSeq` and key the effect on `settings`, and the prompt
  becomes level-triggered on state alone: anyone sitting at their goal gets it on every cold start.
- **"dismissing the prompt lets the next weigh-in raise it again"** pins deliberate behaviour, not a
  leak. An undecided ask should come back; only `acknowledgeGoalOvershoot` silences it durably.
- **`persistEffect.test.tsx` keeps the REAL `persistBackoffMs`** via `requireActual` while mocking
  `reportPersistFailure` around it, because `advanceTimersByTime` is lined up against the real 1s/2s/4s
  schedule.

## Known gaps

- **Nothing here renders `GoalPromptHost`.** These tests pin when `pendingGoalPrompt` is *raised*; that
  it is then suppressed during onboarding (`!settings.onboardingComplete`) and deferred past the nav
  animation by `InteractionManager` is untested.
- **`pendingGoalPrompt` is deliberately in-memory only.** No test covers a process death mid-prompt —
  the progress-screen banner is the intended survivor, and it is not exercised from here.
- **No test crosses the real PowerSync layer.** `powersyncStore` is mocked in every file; its own
  behaviour is pinned in `../database/__tests__/powersyncStore.test.ts`.
