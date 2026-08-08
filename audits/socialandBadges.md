# Social & Badges — brainstorm scratchpad

Working notes for the social feature set (badges → profiles → friends). Updated as decisions are made.
Last updated: 2026-07-24

## Feature vision (user's framing)

1. **Badges** — streak/PR/milestone achievements.
2. **Profiles** — display best set per exercise, streak badges, etc.
3. **Friends tab** — see friends' workout days this week + nutrition streak.

Current sequencing thinking: **badges + profiles first** so users build sentimental attachment
to the app before the social graph exists; friends tab after.

## What already exists (reusable building blocks)

- **Weekly workout days**: `trainedDaysThisWeek` in `context/WorkoutContext/index.tsx:358`;
  rendered by `components/GraphComponents/ActivityBanner.tsx` (N days + 7 dots widget) —
  friend card UI is essentially a reskin of this.
- **Nutrition streak**: `getNutritionStreakState` in
  `context/NutritionContext/functions/graphFunctions.tsx:132`. Day counts if ≥1 entry logged.
  Exposed as `nutritionStreak` from NutritionContext. Existing streak notification nudge
  (`lib/notifications/builders.ts` → `buildStreakNudge`) is the template for future social nudges.
- **Best-set math**: every set = one row in `logs` (weight/reps/rpe/date/exercise_id).
  `estimate1RM` (Epley) + `oneRMMap` in `context/WorkoutContext/functions/oneRepMaxFunctions.tsx`.
  No stored all-time PR concept yet — small derivation on top of existing primitives.
- **Notifications**: local-only scheduling (no push tokens / remote push infra).

## The three real gaps

1. **No user identity anywhere.** No username, display name, or avatar in settings/auth.
   Apple Sign-In returns the user's name ONLY on first sign-in, and
   `context/AuthContext/functions/authFunctions.tsx:30` currently discards it (forwards only
   the identity token). **Time-sensitive:** every new signup without capture is permanently
   nameless. Capture + persist it now, before any social work.
2. **Cross-user reads are impossible by design.** All RLS is strictly `auth.uid() = user_id`;
   PowerSync syncs a single user-scoped bucket. Friends features need new tables
   (`profiles`, `friendships`) + friend-aware RLS. Friend data should be **online-only**
   (direct Supabase query / Edge Function on tab open) — do NOT contort PowerSync buckets.
3. **Derived stats must reach the server.** Friends can't (and shouldn't) compute a streak
   from your raw entries. Pattern: **`public_stats` snapshot table** — each client upserts its
   own derived numbers (workout days this week, nutrition streak, PRs, badge list); one row
   per user, friend-readable. Only derived stats are shared, never the raw food diary or
   body weight. Clean privacy story for App Review.

## Key design decisions

- **Badges are deterministic + recomputable** from local history (e.g. "100 workouts",
  "30-day best streak"), not stored awarded-events. Store only cosmetic state ("seen" flag
  for celebration animation). One badge engine feeds badges, profiles, and friend cards.
- **Profiles ship solo-first as a personal trophy room** (badges, all-time PRs, streak bests,
  totals). Entirely local — no username, no backend, no RLS. When friends ship, the same
  screen becomes the shareable profile. Avoids the empty-network problem.
- **Friends via friend codes / invite links only at launch** (no user search) — kills
  stranger-discoverability problems, avoids search-by-username RLS, fits workout-buddy model.
- **Visibility default: friends-only**, per-field toggles later. NEVER surface body weight or
  calorie numbers on profiles, even opt-in ("best bench 225×5" is a flex; kcal is
  medical-adjacent). App Review + trust risk otherwise.
- **Remote push for social nudges ("friend passed you") is deferred** — needs push infra that
  doesn't exist; friends tab is valuable without it.

## Build approach — DECIDED: badges built in dev hub first, with mock data

- New dev-only route `app/devTest/badgeTesting.tsx` (+ component in `components/devTest/`),
  registered in the Dev Hub — same pattern as the onboarding versions harness; `__DEV__`
  guard keeps it out of production.
- Build ALL badges there against mock data: full grid (every family × every tier color),
  locked states, dark/light, unlock animation driven by crankable mock inputs.
- This is where the open eyeball-TBDs get decided: tier-accent placement on the card
  (pip vs border vs glyph tint) and final glyph compositions.
- Splits the work cleanly: badge COMPONENT and badge ENGINE (pure functions) both proven
  against mock data before touching real contexts.
- Consequence: profile refactor later ships with a FINISHED trophy room on day one —
  resolves the old "profile launches sparse" concern.

## Agreed phasing (revised 2026-07-24 — badges before profile)

- **Phase 1 — badge system in dev hub:** badgeTesting route, badge card component,
  glyphs, tier system, unlock animation, badge engine over mock data.
- **Phase 2 — onboarding refactor (display name):** new screen 0 — "Welcome to PLATES —
  what should we call you?" — single field, Apple-name prefill when available. Name screen
  takes over the WELCOME duty; goals screen sheds intro framing and becomes purely the
  goals question at screen 2, with name-aware copy ("What are your goals, Aadi?"), as do
  plan/projection/paywall. Display name only — NOT a unique handle; no uniqueness
  check/backend. Existing users get a one-time "add your name" prompt on first profile
  visit. Mechanics: skip-aware step numbering in `lib/utils/onboardingSteps.ts` absorbs the inserted
  step; iterate via the dev-hub onboarding harness (onboardingFlow/Page/Preview).
- **Phase 3 — profile screen refactor:** settings tab becomes the Profile/"You" tab.
  Identity header up top (name now exists from Phase 2), Adjust Nutrition + Adjust Training
  stay as prominent quick-action cards (high-frequency actions, don't bury them), gear icon
  top-right → actual settings (profile details, subscription, notifications, account).
  Keep subscription reachable — App Review checks this. Ships WITH the trophy room already
  built (Phase 1) plus existing weekly-days + streak widgets. Navigation work + wiring
  badge engine to real contexts.
- **Phase 4 (the platform phase):** `profiles` / `friendships` / `public_stats` tables,
  friend-scoped RLS, unique @username claim, friend-code adds, friends tab (online-only
  fetch, reusing ActivityBanner pattern).
- **Phase 5:** profile becomes visible to friends; richer sharing.

Sequencing rationale: badges + profile before friends = users build sentimental attachment
(accumulated visible investment) and launch social with pre-loaded content to show, avoiding
the empty-network problem. Until friends exist, the badge celebration moment carries the
retention weight — make unlocks feel special (animation, "new PR" toast).

Insight: badges & profiles are features; `public_stats` + friendship RLS is the *platform* —
design that schema carefully in the platform phase so later phases are just UI.

## Badge criteria — draft v2

- **Nutrition streak ladder:** 7 / 30 / 100 / 365-day (from `getNutritionStreakState`).
- **Longest streak badge:** explicit best-ever streak number (nutrition; later training-week
  run too) — screenshot bait.
- **Training weeks ladder (flagship):** N consecutive weeks — 4 / 12 / 26 / 52.
  **Deload-safe rules:** week counts at **≥2 training days** (a deload week still trains,
  just lighter — days-based metric doesn't punish deloads, only full rest weeks) + **one
  "rest week" pass per 12 weeks** that doesn't break the chain (deload/illness/vacation).
  Never gamify intensity — badge must be indifferent to load so deloading is never "wrong".
- **Protein-goal ladder:** protein target hit 7 / 30 / 100 days (`protein` per entry vs
  `protein_goal`). The SAFE nutrition-quality badge; calorie-goal badges excluded (can
  quietly reward under-eating).
- **Lifetime totals:** 10 / 50 / 100 / 250 / 500 workouts; 100 / 500 / 1,000 meals;
  1,000 sets; 10,000 reps; **lifetime tonnage** ladder (weight×reps, unit-converted).
- **Strength:** First PR + PR-count milestones (10 / 50 all-time e1RM PRs). NO
  absolute-weight badges (user-named exercises = fuzzy detection; kg breaks round numbers) —
  the "featured lifts" profile section covers that itch instead.
- **"Never skips leg day":** legs trained every week N weeks straight (via `main_muscle`).
- **Comeback badge:** first workout after 3+ weeks away — celebrates returning instead of
  shaming it (Duolingo pattern, pure retention).
- **App anniversary:** 1 / 2 years with PLATES (account age).
- **CUT: feature moments** (first meal/scan/etc.) — hollow, it's only their first *in-app*.
- **EXCLUDED on purpose:** weight-change badges ("lost 10 lbs") — ED-adjacent, punishes
  bulking users, App Review risk. Reward process, never body outcomes.

### Lifetime totals vs. future log pruning (planned feature)
Logs older than a dynamically chosen date will eventually be pruned to save space →
lifetime badges need a **checkpoint aggregate**: small per-user stats row (lifetime workout
count, meals, tonnage, sets, reps + `counted_through` date). Before pruning, roll
to-be-deleted rows into the checkpoint; live total = checkpoint + raw rows since.
Trade-off: these badges become "checkpoint + recent" instead of purely recomputable — fine,
but the checkpoint row is unreconstructable after pruning → it MUST sync to Supabase.
Design the checkpoint BEFORE the pruning feature ships.

## Badge visual system (evolving — glyph direction is active brainstorm)

- **Anatomy:** container (shared base) + glyph (per-family identity) + tier color.
  All code-drawn (react-native-svg / icon sets) — no image assets, theme-reactive.
- **Unique glyph per badge family** (user direction, brainstorm): fire + fork/knife =
  nutrition streak; ladder = training-weeks ladder; weight plate = lifetime tonnage
  (the literal one); dumbbell = lifts. Compositions are layered standard icons —
  "unique art" energy at one-shape prices. RULE: max 2 elements per glyph (mush at grid size).
- **Container — DECIDED: plain small card, nothing fancy.** Badge glyph sits on a normal
  small card (matches existing app card language; Apple Fitness / Strava trophy-grid
  pattern). No ring.
- **Tier color placement on the card — TBD by eyeballing in dev hub:** small colored pip
  in corner OR thin tier-colored border/top edge (lean), OR tinting the glyph itself
  (blue flame is odd). Glyph keeps natural color; locked = grayed glyph on card.
- **Tier colors: competition plate ladder** white→green→yellow→blue→red;
  the tonnage badge (actual plate glyph, plate = tier color) teaches the color system.
- **What tiers ARE:** the threshold ladders already in the badge list — e.g. nutrition
  streak 7=white / 30=green / 100=blue / 365=red; training weeks 4/12/26/52; lifetime
  workouts 10/50/100/250/500 uses all five. One-offs (comeback, leg day, anniversary)
  are tier-less.
- **One evolving badge per family (Option B)** — NOT one badge per tier. Ring upgrades
  color as you climb; badge shows highest tier; tap opens ladder + progress to next color
  (built-in "what's next" retention hook). Locked = gray silhouette.
- Featured-lifts widget (not a badge) uses the dumbbell glyph on its rows — one visual
  language across badges and widgets.
- Why code-drawn: zero image assets, theme-reactive (dark/light free), scales tiny→huge
  (friend card → unlock animation), new badge = config entry (icon + thresholds), not an
  art task.
- Later, if ever: unique art ONLY for a few pinnacle badges (365-day streak, 52-week run,
  1M lb tonnage) — special because the rest are uniform.

## Onboarding name step — DECIDED: new screen 0

- Name is its OWN tiny first screen (user's call): "Welcome to PLATES — what should we call
  you?" — single field, Apple-name prefill when available. Easiest-question-first builds
  answer momentum.
- The name screen inherits the WELCOME/first-impression duty from the goals screen —
  that's the goals-screen refactor: shed its intro framing, become purely the goals
  question (now screen 2), with name-aware copy ("What are your goals, Aadi?").
  Plan/projection/paywall copy also becomes name-aware.
- Mechanics: skip-aware step numbering in `lib/utils/onboardingSteps.ts` absorbs inserted steps;
  iterate the screen in the dev-hub onboarding harness.

## Profile widgets (not badges — no earn condition)

- **GitHub-style training grid:** last 30 days, theme-blue squares for trained days.
  Lives on the PROFILE (showoff surface; progress tab already answers "am I improving").
  Becomes the most glanceable friend-card element when profiles go visible.
  Head start: `NeutralComponents/CalendarMonthGrid.tsx` month-grid layout (date-picker style,
  adaptable to heatmap).
- **Featured lifts:** user pins 1–3 exercises; show all-time best set (weight×reps with
  highest e1RM). User-chosen = sidesteps the "which exercise is bench" detection problem.

## Avatars — DECIDED: generated, not photos

- LOCKED: initials + user-picked theme color + username. Zero assets, offline, no backend.
  Optionally a small preset icon set later for personality.
- Key reason beyond storage: photos visible to other users = UGC → Apple requires
  moderation/report/block mechanisms. Not worth it for a pfp. (Storage itself would be
  Supabase Storage, not S3 — cheap; the compliance burden is the real cost.)
- Photo upload only much later, if ever, once friends exist and UGC compliance is being
  done anyway.

## Open questions
- ~~Where does the personal profile live~~ → DECIDED: settings tab becomes the Profile tab.
- Profile layout — DECIDED order: identity header → Adjust Nutrition / Adjust Training
  quick-action cards (utility above browse content) → trophies/badges → PRs & streak bests →
  activity widgets. Trophies BELOW the actions so the badge section can grow freely.
- (both former open questions decided — see Badge visual system + Onboarding name step below)
- When friends exist: what exactly is on the friend card v1 (workout days + nutrition streak
  only, or badges too)?
