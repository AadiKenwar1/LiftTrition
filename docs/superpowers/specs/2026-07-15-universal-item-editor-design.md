# Universal Item Editor + Richer Food Search — Design

Date: 2026-07-15
Supersedes/expands: AUDIT_MAJOR.txt "Ingredient brand names silently vanish +
unify the entry editors" (minor #9, promoted) and its plan in
docs/superpowers/plans/2026-07-15-audit-minor-fixes.md (Task 17). Where this
design and Task 17 differ, this design wins — it commits to the "undecided"
17e direction (unify on one editor) and adds product scope (search-row macros,
the ingredient→item rename, entry-row brand display, combined-name handling).

## Vocabulary note (important)

Throughout this design and the resulting code/UI, **"item" is the new name for
what the database still calls an "ingredient."** They mean the same thing. The
TypeScript type, all in-code identifiers a developer reads, and every on-screen
label are renamed to **Item**; the database tables keep their existing names
(`nutrition_entry_ingredients`, `saved_nutrition_entry_ingredients`) to avoid a
risky live-data migration for a cosmetic gain. See W3 for exactly where the
"item = ingredient" note is recorded.

## Problem

1. **Brand names silently vanish.** The AI vision contract returns a `brand`
   per ingredient and the in-memory type carries it (`Ingredient.brand`,
   `types.ts:8`), but neither ingredient table has a `brand` column, so brand
   is `undefined` after every restart. `foodDBModal` drops brand entirely on
   add.
2. **Two divergent editors.** `editPhotoEntry.tsx` is a full item-list editor
   (per-item name, servings stepper, Cal/P/C/F, add/remove, live totals,
   brand-aware drafts). `editManualEntry.tsx` edits only four entry-level macro
   totals + name — no item UI. They have already drifted (see #3).
3. **Cleared-name divergence.** Add writes `"Unnamed Entry"` for a blank name
   (`addNutritionModal.tsx:51`); Edit silently restores the old name
   (`editManualEntry.tsx:53` `name.trim() || parsedEntry.name`).
4. **Search results hide macros.** FoodDB search rows show name + brand but no
   macros until *after* you tap add (`foodDBModal.tsx:344-357`). Macros are
   already returned by FatSecret in the search payload's `food_description`
   field but discarded by the edge function (`fetchFoodDB/index.ts:65-69`).
5. **Added foods aren't item-shaped.** `foodDBModal` and `savedNutritionModal`
   write entries **directly** (no editor). FoodDB writes `ingredients: []`
   even for a single food, and its combine path sums everything into one blob
   named `"A + B"` — so a combined entry can't have its parts edited or show
   their individual brands.

## Goals

- Persist `brand` so it survives restart and round-trips through the DB.
- Show macros **and** brand inline in food-search rows, before adding.
- Make one editor (`editEntry`) the single edit surface for **every** entry,
  regardless of origin (manual, saved, foodDB, photo). Retire
  `editManualEntry`.
- Model every entry as a list of **items** (≥1), so combined foods show each
  source food as its own editable, individually-branded row.
- Unify blank-name behavior so Add and Edit never disagree.

## Non-goals

- No database table rename (`*_ingredients` tables keep their names).
- No forced edit step on add — adding stays fast; the editor is post-hoc only
  ("edit-after-only").
- No change to server-side entitlement/rate-limit (that's AUDIT_MAJOR #4).
- Not merged with Task 11's `useFoodSearch` race hook — W4 shares the
  `foodDBModal` file with it but is independent; coordinate, don't fold.

## Key decisions (locked)

- **Edit-after-only.** Add flows keep writing directly to the day. The unified
  editor is reached only via the post-hoc Edit / breakdown action.
- **Everything is items.** Every add path persists ≥1 item, so every entry
  opens cleanly in the one item-list editor:
  - Manual add → 1 item `{ name = meal name, qty 1, its macros }`
  - FoodDB single add → 1 item (with its brand)
  - FoodDB combine → N items (each food a row, each with its own brand)
  - Saved single / combine → already carry items; keep (`scaleIngredients`)
  - Entry-level totals = sum of items (already how `editPhotoEntry` computes)
- **Single-item entries: entry name and item name are one thing.** For an
  entry with exactly one item, the entry name and that item's name are kept in
  sync — the user only ever sees/edits one name; they can never disagree.
- **Collapsed entry-row display:** brand shown *only* where it fits —
  - 1 item  → subtitle = the item's brand (e.g. "Fage")
  - N items → subtitle = "N items"; individual brands appear per item in the
    breakdown/editor.
- **Naming rules (unified across the app):**
  - Single item, blank name → the item's own name
  - Manual entry, blank name → "Unnamed Entry"
  - Combined entry, blank name → "Combined Items" (but the combine UI
    **pre-fills** the name field with the joined item names, e.g.
    "Greek Yogurt + Oats", truncated — editable, never blocking the add)

---

## Workstreams

### W1 — Persist `brand` (foundation)

Exactly Steps 1–6 of Task 17 (docs/superpowers/plans/2026-07-15-audit-minor-fixes.md),
unchanged:
- Migration `lib/supabase/migrations/ingredient_brand.sql`:
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS brand text` on both ingredient
  tables.
- `lib/powersync/AppSchema.ts` — add `brand: column.text` to
  `nutrition_entry_ingredients` (lines 71-83) and
  `saved_nutrition_entry_ingredients` (lines 101-113).
- `context/NutritionContext/database/powersyncStore.ts` — both read-mappings
  (`rowToNutritionEntry` 25-32, `rowToSavedNutritionEntry` 73-80) read
  `brand: ing.brand ?? null`; both INSERTs (183-189, 222-229) write `brand` in
  the column list + bind array, positions aligned.
- Connector needs **no change** (nutrition uses the generic `{ ...op.opData }`
  upsert path).
- Tests: converter round-trip (brand persists; legacy row with no brand → null).

### W2 — "Everything is items" data model

Every add path produces ≥1 item, each carrying its own `brand` where known:
- `addNutritionModal.tsx` `handleAddEntry` (46-65): instead of
  `ingredients: []`, create one item from the typed name + parsed macros
  (qty 1). Entry name and the single item name are the same value.
- `foodDBModal.tsx` `handleAddAll` (137-196):
  - Non-combined: one entry per food, each with **1 item** carrying the food's
    name, brand, servings (qty), and per-serving macros — not `ingredients: []`.
  - Combined: **one entry with N items** (each food a row with its own brand),
    replacing the summed-blob `" + "` path. Entry name pre-filled from joined
    item names; blank → "Combined Items".
- `savedNutritionModal.tsx` `handleAddAll` (81-143): already merges items via
  `scaleIngredients`; keep. Ensure each merged item's brand is carried (relies
  on W1 persisting brand on saved-meal items). Combined-name pre-fill/fallback
  same as foodDB.
- Entry-level macros remain the sum of item macros everywhere.

### W3 — The one editor (`editEntry`)

- **Rename** `app/nutritionScreens/editPhotoEntry.tsx` →
  `app/nutritionScreens/editEntry.tsx`. It already renders/edits an item list,
  brand-aware drafts, live totals — no logic change needed to serve all entry
  types.
- **Retire** `app/nutritionScreens/editManualEntry.tsx`.
- **Rename ingredient→item in code/UI:** the `Ingredient` TS type → `Item`
  (`context/NutritionContext/types.ts`), and all developer-read identifiers
  (`DraftIngredient` → `DraftItem`, `sumIngredients` → `sumItems`,
  `scaleIngredients` → `scaleItems`, `toIngredient`/`toDraft`, etc.) plus
  on-screen labels. **DB tables and columns keep their `*_ingredients` names.**
- **Record the "item = ingredient" note** in two places:
  1. A comment on the `Item` type and at the converter boundary in
     `powersyncStore.ts` (where `Item` maps to `nutrition_entry_ingredients`
     rows): "Item = the DB's 'ingredient' row; renamed in code/UI, table names
     kept to avoid a live migration."
  2. A one-line entry in `CLAUDE.md` conventions.
- **Routing** (`app/nutritionScreens/nutritionScreen.tsx`): `handleEdit`
  (38-44) and the breakdown button (99) both route to `editEntry` for **all**
  entries — drop the `isPhoto ?` branch; the edit/breakdown affordance shows
  for every entry, not just photo entries.
- **Registration** (`app/_layout.tsx`): remove the `editManualEntry` Stack
  screen; rename the `editPhotoEntry` route to `editEntry`.
- **Shared save handler:** blank name → `'Unnamed Entry'` (change
  `editPhotoEntry`'s current `name.trim() || parsedEntry.name` to
  `|| 'Unnamed Entry'`). Goal D solved by construction — the divergent
  `editManualEntry` path no longer exists.
- **Single-item name sync:** when an entry has exactly one item, editing the
  name edits both the entry name and the item name (one field in the UI).
- **Brand display in editor:** show/edit `brand` per item row (persisted via
  W1).
- The existing "at least one item required" guard is now always satisfiable
  because every entry has ≥1 item.

### W4 — Richer food-search rows (macros + brand)

- **Edge function** (`lib/supabase/functions/fetchFoodDB/index.ts:65-69`): pass
  the discarded `food_description` (and its serving basis) through in each
  search result.
- **Types** (`lib/foodDB/types.ts`): extend `FoodSearchResult` with the parsed
  macro preview fields (or the raw `food_description` for the client to parse).
- **Client** (`foodDBModal.tsx` search `FoodRow`, 344-357): render macros +
  brand inline, mirroring how "popular foods" already pass `macros`
  (325-334). Label as a preview from the search basis; the precise per-serving
  numbers still resolve on add via `getFoodItem`.
- Independent of Task 11's `useFoodSearch` hook — coordinate edits to the same
  file, don't merge the two changes.

### Collapsed entry-row display (W2/W3 UI)

- `Entry` / `SavedEntry` collapsed rows: subtitle = the single item's brand
  when the entry has 1 item, else "N items". Breakdown (per-item, with brands)
  is the tap-through, now available for every entry.

---

## Testing

Testing is a first-class requirement of this work, not an afterthought. Two
kinds, both mandatory:

- **Jest tests for all logic.** Every non-visual behavior below ships with a
  passing unit test, written TDD-style (failing test first). No logic change
  merges without its test.
- **Dev Hub pages for ALL visual parts.** Every screen/component touched or
  added gets a Dev Hub test page (`components/devTest/`) exercising its edge
  cases, following the existing pattern (CLAUDE.md "Dev tooling": add
  `XTest.tsx`, a `__DEV__`-guarded stub `app/devTest/x.tsx`, then register in
  the `app/_layout.tsx` Stack and the `GROUPS` array in `DevHub.tsx`).

### Visual-approval gate (blocking)

**Each visual part must be built as a Dev Hub page and approved before that
workstream is considered done and before dependent work continues.** The loop
per visual part: build it → open the Dev Hub page on a simulator in **light and
dark** → the user reviews and approves → only then proceed. No visual part is
"finished" on the strength of code review or Jest alone.

### Jest (logic)

- **W1 — converters:** brand round-trips through `rowToNutritionEntry` /
  `rowToSavedNutritionEntry`; a legacy row with no brand → `null`.
- **W2 — add-path item shapes:** manual → 1 item; foodDB single → 1 item
  carrying its brand; foodDB combine → N items each carrying its own brand;
  saved combine keeps each item's brand.
- **W3 — name rules & routing:** blank manual name → "Unnamed Entry"; combined
  blank name → "Combined Items"; single-item entry name edit syncs entry+item;
  every entry type routes to `editEntry` (no `isPhoto` branch).
- **W4 — search parse:** `food_description` parses into macro-preview fields;
  malformed/missing description degrades gracefully (no macros shown, no crash).

### Dev Hub (visual — each needs approval)

- **`editEntry`** — the unified editor across scenarios: 1 item, many items,
  each with/without a brand, long names, add/remove item down to the "at least
  one" guard, single-item name-sync, blank-name save. (Extend or replace the
  existing editPhotoEntry-oriented dev page rather than duplicate it.)
- **Food-search row (W4)** — `FoodRow` for a search result showing macros +
  brand: with brand, without brand, long name, missing/partial macros.
- **Collapsed entry row (`Entry` / `SavedEntry`)** — 1-item entry showing its
  brand subtitle; N-item entry showing "N items"; no-brand item; long names.
- **Combine UI (`StagedSection` in foodDB and saved)** — combine toggled on
  with the pre-filled joined name, name cleared → "Combined Items" fallback,
  2 items vs many, each item's brand visible in the staged list.

## Release checklist

- Run `lib/supabase/migrations/ingredient_brand.sql` in Supabase at release,
  alongside the already-pending `nutrition_calories_real.sql`.

## Open questions

- None blocking. (Table rename intentionally declined; W4 kept in this spec
  rather than split.)
