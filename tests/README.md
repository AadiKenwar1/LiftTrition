# Tests — documentation conventions

This folder holds testing **documentation only**. No test code lives here; tests stay in
`__tests__/` folders colocated with the code they test.

## Areas

An **area** is a folder exactly one level inside `lib/` or `context/`, plus `shell` for the
app-shell guarantees in `app/_layout.tsx`.

- **Exactly one level.** `lib/hooks/` is an area. `context/NutritionContext/hooks/` is two levels
  down, so it belongs to the `nutritioncontext` area — it does not get its own file.
- **The file is the folder's own name, lowercased.** `lib/utils/` → `utils.md`.
  `context/WorkoutContext/` → `workoutcontext.md`. No path prefixes, no renaming, no judgment.
  Lowercase mechanically — CI is case-sensitive even where the dev machine is not.
- **UI folders are not areas.** Screens and components have no area file. Their guarantees are
  stated in the domain area they serve — "cancelling a scan aborts the request" belongs in
  `nutritioncontext.md`, even though the code is in `app/nutritionScreens/analyzingModal.tsx`.
- **An area exists only where behaviour can be wrong.** A folder of constants or pure markup
  earns no file.

Fourteen areas:

| File | Covers | Guarantees about |
|---|---|---|
| `utils.md` | `lib/utils` | dates, numbers, conversions, goal math, downsampling |
| `powersync.md` | `lib/powersync` + `components/GuardComponents` | offline-first sync, upload flush, watchdog, first-sync gating |
| `supabase.md` | `lib/supabase` | session storage, auth internals, edge-function transport |
| `notifications.md` | `lib/notifications` | reminder scheduling, permissions, prefs |
| `fooddb.md` | `lib/foodDB` | food search, quota, caching |
| `openai.md` | `lib/openAI` | photo analysis, image sizing, cancellation |
| `hooks.md` | `lib/hooks` | debounce, submit-once, async load, today |
| `workoutcontext.md` | `context/WorkoutContext` | progression, fatigue, volume, 1RM, logs |
| `nutritioncontext.md` | `context/NutritionContext` | entries, saved meals, AI flow, macros |
| `settingscontext.md` | `context/SettingsContext` | profile, targets, body weight, goal-reached |
| `authcontext.md` | `context/AuthContext` | sign-in, sign-out, account deletion |
| `billingcontext.md` | `context/BillingContext` | entitlement, purchase, restore |
| `themecontext.md` | `context/ThemeContext` | scheme resolution, token integrity |
| `shell.md` | `app/_layout.tsx` | route guarding, provider order, error boundary |

Two of these are deliberate exceptions to the folder rule, and both are worth knowing:

- **`GuardComponents` folds into `powersync.md`.** PowerSyncGuard and SyncWatchdog are the UI
  surface of sync health; the guarantee belongs to sync, not to the component.
- **`shell.md` is named after what it is, not a folder.** Route guarding, provider ordering and
  the error boundary are real guarantees with no domain home.

`lib/utils` stays a single area despite covering unrelated helpers. Splitting it would produce a
dozen one-guarantee files, and its module README is per-`__tests__/` folder anyway.

## The two levels

Testing documentation exists at two levels. They answer different questions, and that split
is what keeps them from drifting into two descriptions of the same thing.

| | `<module>/__tests__/README.md` | `tests/<area>.md` |
|---|---|---|
| Answers | Why do these tests exist? What's tricky here? | What can I rely on? |
| Audience | Someone editing this module | Someone who needs to know what the app guarantees |
| Contents | Harness, fixtures, logic kind and bar, non-obvious cases, known gaps | Proven behaviour, plus what is knowingly unproven |
| Names test cases? | Yes | No |

The area file naming no test cases is deliberate — it stops that file becoming a summary of
the local README, which is the fastest way to end up with two docs that disagree.

A module README exists wherever tests exist, including in UI folders that are not areas.
`app/nutritionScreens/__tests__/README.md` documents that folder's render harness; its
guarantees are written up in `nutritioncontext.md`.

## Writing the area file

Behaviour goes in **product language** — what a user would notice, not what a function returns.

> One bad session never lowers your suggestion; two in a row does.

not

> `getProgressionState` returns the prior anchor when the previous session scored higher.

The **Not proven** section is the most valuable part of the file. A document that lists only
what passes is marketing; one that names its gaps is an instrument. Write the gap even when —
especially when — nobody has scheduled the fix.

## The footer

Every area file ends with one line:

```
Area: <path/to/module> · <n> cases · reviewed <YYYY-MM-DD>
```

- **Area** — the module path the file describes. This is the file's real identity; the filename
  is only a handle.
- **n cases** — the test count the file was written against.
- **reviewed** — the date a human last read the file against the tests.

There are **no IDs** linking prose to individual tests. The footer is the honesty signal
instead: a moved count or a stale date is a prompt to re-read. The trade is deliberate — these
files describe behaviour, they don't contract it. The contract is the test.

## Kinds of logic, and how each is tested

Coverage is set by what kind of logic a function is, not by a fixed count. The kind is
recognisable on sight, and it determines both the bar and how cases are derived.

Declare the kind in the module README so a wrong classification is visible rather than silent.

### 1. Business rules

The app's own opinions. No external authority exists.

*`getProgressionState`, `gradeSet`, `computeBwUpdate`, `calculateFatigueSummary`, `getCalibrationMessage`*

- **Where the answer comes from:** nowhere. The test *is* the specification.
- **Deriving cases:** from intended behaviour stated in product terms. If it isn't written down
  anywhere, it has to be decided before the case can be written.
- **Method:** a scenario matrix — `[name, input history, expected outcome, reason]`, one row per
  real user situation.
- **Done when:** you cannot name a user situation the table doesn't already cover.
- **Stop and ask:** always, when the implementation surprises you. Never encode a surprise as
  correct.
- **Bar:** the full 10 happy / 10 challenging / 10 edge / 10 miscellaneous. This is the only kind
  where those four buckets apply.

### 2. Formulas

Math with a correct answer that exists outside this app.

*`lbsToKg`, `calculateOneRepMax` (Epley), `macroCalculation` (Mifflin-St Jeor), `daysBetween`, `downsample`*

- **Where the answer comes from:** the external source — the paper, the standard, the constant.
- **Deriving cases:** reference values computed independently of the code.
- **Method:** a known-value table plus threshold boundaries.
- **Done when:** every reference value is covered, every branch is hit, and rounding/precision
  behaviour is pinned.
- **Stop and ask:** when the code disagrees with the source. That is a bug, not a failing test.
- **Bar:** usually 8–15. Exhaustive against the source, not padded to a number.

### 3. Validation & parsing

Rejecting or coercing bad input.

*`validateMacro`, `validateHeightWeight`, `parseNumericInput`, `sanitizeInt`, `parseFoodDescription`*

- **Where the answer comes from:** the rule as stated to the user — the error message and the
  documented constraint.
- **Deriving cases:** from the accept/reject boundary.
- **Method:** one accept case, then attack the boundary.
- **Done when:** every reject reason has a case and no input class is untested — NaN, Infinity,
  null, `''`, whitespace, negative, zero, locale comma, overflow.
- **Stop and ask:** when the message and the guard disagree. An error reading "must be 1–10"
  while the guard accepts 0 is a bug in one of them.
- **Bar:** usually 10–15, weighted almost entirely to the reject side.

### 4. State & concurrency

Modes, transitions, races, guards.

*watchdog status, `onboardingStep`, load/retry/failure paths, the settings persist rollback race, `useSubmitOnce`, `useDebouncedSave`*

- **Where the answer comes from:** the state diagram, written first — informally is fine.
- **Deriving cases:** states × events.
- **Method:** assert the transition for every pair, including the illegal ones — an event
  arriving in a state that should not accept it.
- **Done when:** the matrix is full and every nameable race has a case: double-fire,
  out-of-order resolve, unmount mid-flight, abort after success.
- **Stop and ask:** when a transition has no defined answer. That is a design gap, not a test gap.
- **Bar:** transition coverage, not a count. One real race case is worth forty leaf cases.

### 5. Persistence & integration

SQL, network, third-party SDKs, the OS.

*`insertLog`, `loadWorkoutData`, `uploadData`, `purchasePackage`, `callEdgeFunction`, `requestPermission`*

- **Where the answer comes from:** the contract of the thing being called — the schema, the
  response shape, the SDK docs.
- **Deriving cases:** from the failure surface, not the happy path.
- **Method:** happy path once, then the failure matrix.
- **Done when:** timeout, 4xx, 5xx, malformed payload, offline, partial write, abort/cancel and
  permission-denied all have cases — plus the rollback or retry behaviour after each.
- **Stop and ask:** when the code swallows a failure. Silent failure is a bug to report, not
  behaviour to pin.
- **Bar:** usually 15–20. Ten happy paths through `purchasePackage` prove nothing that one does not.

### 6. Presentation

Strings, colours and positions produced for display.

*`weightUnitLabel`, `goalReachedBannerCopy`, `formatDateShort`, `getInitials`, `niceScale`, `targetTone`*

- **Where the answer comes from:** the rendered output as designed.
- **Deriving cases:** the branches that change the output.
- **Method:** one case per distinct output.
- **Done when:** the outputs are enumerated. Nothing beyond that.
- **Stop and ask:** rarely. If a format is genuinely ambiguous, pick one and note it in the
  module README.
- **Bar:** whatever the branch count is. `weightUnitLabel` is two cases and genuinely complete.

## Rules that apply to every test

- **Never derive an expectation by running the function.** That turns a bug into a specification,
  and it is the main way retrofitted tests go wrong.
- **A test that would still pass if the function were wrong is not a test.** Delete it.
- **Fixtures come from the shared builders**, not hand-rolled per file. Six private spellings of
  the same mock log is how a suite stops being editable.
- **When the right answer can't be determined, stop and ask.** This bites hardest on business
  rules, where there is nothing to look it up in.

## Exemptions

`app/devTest/`, `components/devTest/` and `lib/devtools/` are exempt from all of the above.
Their `__DEV__` guards are statically false in production, so the bundler removes the code and
there is nothing shipped to guarantee — and Jest runs with `__DEV__` true, so the no-op
behaviour isn't reachable from a test anyway. Tests that already exist there stay; no new ones
are owed, and neither documentation level applies.

The exemption follows the guard, not the folder. Code behind a **runtime** flag — a
server-driven toggle, an entitlement check, an env var read at runtime — ships and can flip, so
it is tested like anything else.

## Keeping them current

Changing test cases means checking the area file in the same pass and updating it whenever the
proven behaviour moved. Adding cases that prove nothing new needs only the count bumped.

## Templates

Copy from `_templates/` when an area or module gets its first doc:

- `_templates/area.md` → `tests/<area>.md`
- `_templates/module-readme.md` → `<module>/__tests__/README.md`

Neither is generated or auto-created.
