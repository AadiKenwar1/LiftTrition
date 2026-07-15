# Food DB Teaser + Popular Foods — Design

Date: 2026-07-14
Companion to: 2026-07-14-unified-camera-scan-screen-design.md (same free-teaser
conversion strategy, applied to the Food Database)

## Problem

1. **Free users are hard-bounced.** The Food DB FAB (`app/(tabs)/index.tsx:67`)
   routes non-premium users straight to `/settingsScreens/subscription` — they
   never see the feature they're being asked to pay for.
2. **The empty state is blank.** With no query, the screen says "Enter a search
   term to find foods" — dead space for everyone, free and premium.
3. **Search burns API quota per keystroke-pause.** The 500 ms debounced effect
   fires a live FatSecret call (via edge function) on every typing pause.

## Goals

- Free users can open the Food DB, browse real foods with real macros, and hit
  an upgrade prompt only on deliberate actions (add / search) — value before
  ask, for higher conversion than the blind bounce.
- A curated "Popular foods" section replaces the blank empty state for
  everyone, at zero API cost.
- Search becomes an explicit action (button / return key) — one API call per
  deliberate search, for everyone.

## Non-goals

- No server-side subscription enforcement (that is AUDIT_MAJOR issue 4, still
  open; this design keeps free users at zero API usage client-side but does not
  close the server hole).
- No change to manual entry (stays free) or saved foods.
- No metered/free-search quota — free users get no live search at all.

## Constraints & rationale

- **Free users must cost zero API quota.** FatSecret calls are real money and
  issue 4 means the server can't yet enforce subscription. Therefore the free
  tier gets the static Popular Foods list only; the Search action itself is
  gated.
- **Gate on deliberate action, never ambush.** Typing and browsing are never
  blocked; the prompt appears on tapping + or Search. Dismissing the prompt
  returns to browsing (content remains behind the card, unlike the camera where
  Go Back exits). Manual logging stays free, so the gate is defensible.
- **Navigation:** the upgrade CTA must use
  `router.replace('/settingsScreens/subscription')` — foodDBModal is a modal
  route; `push` would present the card-presentation subscription screen as a
  second, undismissable modal (the exact bug fixed on the camera teaser).

## Design

### PromptCard rename (pre-work)

`components/NutritionComponents/ScanPromptCard.tsx` →
`components/NeutralComponents/PromptCard.tsx`. Same props/markup — it was
never scan-specific. Update imports in `cameraScreen.tsx`,
`components/devTest/ScanScreenTest.tsx`, and the RESTYLE_PLAN.md entry.
`ScanBackdrop` keeps its name/folder (genuinely scan-specific).

### Popular Foods (everyone)

- `lib/foodDB/popularFoods.ts` — static, hand-curated `FoodItem[]` (~15–20
  staples) plus a `serving` display string per item. Pure data, zero runtime
  fetching, works offline.
- **Sourcing: one-time FatSecret dev pull.** The Dev Hub page gets a temporary
  "Dump popular foods" button that loops the curated queries through the
  existing `getFoodSearchResults` + `getFoodItem` and console.logs the
  resulting JSON; the user runs it once (authenticated, premium), and the
  output becomes the file verbatim — numbers byte-identical to live search.
  (~40 calls, once, ever.)
- Rendered as a "Popular foods" section whenever the query is empty. Premium
  tapping + on a popular item skips the `getFoodItem` details call (macros are
  already local) → straight to the quantity modal → existing staging pipeline.

### Search (decided during prototype iteration — supersedes the earlier
### explicit-button design)

Debounced auto-search returns, tuned for cost: 700 ms debounce (was 500),
minimum 3 characters before a call fires (kills worthless prefix queries),
premium-only (free users are gated at the keyboard, below, so the effect can
never fire for them). Editing the query invalidates the previous results
(no stale list while composing). The in-memory cache in `lib/foodDB` applies
as always. Rationale: FatSecret matching is literal, so users cope by
iterative refinement — search-as-you-type is the UX that matching quality
demands; the dominant cost lever (free users = zero calls) is preserved.

### Free-user gating

| Free action | Result |
| --- | --- |
| Open Food DB from FAB | Full real UI + Popular Foods with macros |
| Tap + (popular item) | PromptCard upsell overlay |
| Tap the search field (focus) | PromptCard upsell overlay — free users never type, so auto-search can never fire for them |
| Scroll, browse | Never blocked |

- The gate is `PromptCard` conditionally rendered as the last child of the
  screen's root view (its own absolute-fill dim blocks touches — same
  mechanism as the camera; no Modal wrapper needed). `Keyboard.dismiss()` when
  the gate opens.
- CTA → `router.replace('/settingsScreens/subscription')`. "Maybe Later" (the
  card's onGoBack) closes the overlay and returns to browsing.
- Draft copy (user-editable): icon `Database`, title "Unlock the Food
  Database", message "Search a million-plus foods and log macros in seconds.
  Upgrade to add foods straight from the database.", CTA "Upgrade to
  Continue", secondary "Maybe Later".
- Defensive: Add All is unreachable for free users (nothing can be staged),
  but the handler guards on `hasPremium` anyway.

### FoodRow extraction

The search-result row JSX (name / brand / + button) is extracted from
`foodDBModal.tsx` into `components/NutritionComponents/FoodRow.tsx`, with
optional serving line and macro pills so the Popular Foods section renders the
identical look with its richer local data. Used by: search results, popular
foods, and the Dev Hub page (mock data).

### FAB

`app/(tabs)/index.tsx:67` — Food DB button always opens `foodDBModal`; drop
the `hasPremium ?` branch. `nutritionUnavailableFabButtons` becomes dead —
delete it (note: `workoutUnavailableFabButtons` is pre-existing dead style,
separate cleanup).

### Dev Hub working prototype (user-requested, built first)

Not a mock viewer — a **fully working implementation of the new Food DB,
hosted in the Dev Hub**, composed from the real shippable pieces
(`PromptCard`, `FoodRow`, `popularFoods.ts`) so migration is a move, not a
rewrite. `components/devTest/FoodDBTest.tsx` + `app/devTest/foodDB.tsx` stub +
`_layout.tsx` registration + DevHub GROUPS entry.

The prototype runs the real flow end to end: explicit-search button → real
`getFoodSearchResults`/`getFoodItem` calls (real API cost during iteration,
accepted), popular-foods section, free gates → PromptCard, quantity modal →
staging → real `handleAddNutrition` writes (same precedent as the
ForceSaveFailure dev controls). Two prototype-only affordances:
- A local Free/Premium Segmented override so gating states flip instantly
  while iterating (migration swaps this for `useBilling().hasPremium`).
- The temporary "Dump popular foods" sourcing button (deleted after the pull).

## Phasing

- **Phase 0 (working prototype in Dev Hub):** PromptCard rename →
  `popularFoods.ts` (placeholder data until the dump runs) → `FoodRow` →
  FoodDBTest prototype incl. dump button → user runs dump → real data lands in
  `popularFoods.ts` → user iterates on the prototype until it works well.
- **Phase 1 (migrate):** foodDBModal renders the proven composition (search
  button, popular section, gates keyed on real `hasPremium`) + FAB change +
  RESTYLE_PLAN update; prototype page stays as the dev harness.

## Testing

- TDD unit: `popularFoods` data sanity (unique ids, positive macros, non-empty
  names/servings).
- Screens: manual per repo convention — simulator with Force Free Mode ON/OFF,
  dark and light, plus the Dev Hub variants page.

## Verification checklist (device)

1. Free (force-free ON): FAB → Food DB opens with Popular Foods; + →
   PromptCard; Maybe Later → still browsing; Search tap → PromptCard; CTA →
   subscription screen arrives with working back button.
2. Premium: empty state shows Popular Foods; + on popular → quantity modal
   with no network spinner; typed query only searches on button/return; add
   flow unchanged end-to-end.
3. Dev Hub → Food DB page: all variants render in dark + light.
