# Universal Item Editor + Richer Food Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-15-universal-item-editor-design.md` — read it first; it is authoritative where this plan is ambiguous.

**Goal:** Persist per-item `brand`, make every add path produce ≥1 item, unify all entry editing into one `editEntry` screen (retiring `editManualEntry`), rename ingredient→item everywhere a developer/user reads, and show macros+brand inline in food-search rows.

**Architecture:** A new pure-logic module (`entryBuilders.ts`) owns all name rules and entry/item shapes so components stay thin and everything is Jest-testable. Persistence gains one nullable `brand` column per ingredient table (DB names unchanged). The existing `editPhotoEntry` screen already renders an item list — it becomes `editEntry` with small save-handler changes. Four Dev Hub pages gate every visual change behind user approval.

**Tech Stack:** React Native / Expo SDK 54, TypeScript strict, Expo Router, PowerSync + Supabase, Jest (jest-expo).

## Global Constraints

- **NO git operations.** Never run `git add/commit/branch/push` or create PRs — the user owns all version control. Each task ends with a **Checkpoint** step: run the verifications, report results, and stop for the user to review/commit.
- **Vocabulary:** "item" is the new name for what the DB calls an "ingredient" — same concept. DB table names (`nutrition_entry_ingredients`, `saved_nutrition_entry_ingredients`), their column names, the generated `*IngredientRecord` TS types (they mirror table names), and the AI vision JSON wire key `ingredients` all KEEP their names. Everything else a developer reads says "item".
- **Visual-approval gate (blocking):** every visual part must be built as a Dev Hub page, opened on a simulator in **light and dark**, and approved by the user **before the task is considered done**. Passing Jest/code review alone never closes a visual task.
- **Theming:** never hardcode colors/fonts/radii — use `useColors()` / `fonts` / `radius` from `@/context/ThemeContext`, `makeStyles(colors)` + `useMemo` pattern.
- **Tests:** run with `npx jest <path>` (NOT `npm test` — that's `--watchAll`). Type-gate with `npx tsc --noEmit`.
- **Copy rules (exact strings):** blank manual name → `'Unnamed Entry'`; blank combined name → `'Combined Items'`; join separator → `' + '`; quantity suffix → ` ×{q}` only when q > 1.
- **Invariant:** entry-level macros = `sumItems(entry.items)` on every write path. (Known, accepted consequence: manual-add calories are now rounded to a whole number by `sumItems`, e.g. 391.5 → 392 — uniformity beats the stray decimal; the item keeps the exact value.)
- UUIDs via `react-native-uuid`; date keys via `getDateKey` (`en-CA`).
- The user deploys server-side artifacts (SQL migration, edge function) — the implementer only writes the files and flags them.

---

### Task 1: W1 — Persist `brand` (migration, schema, converters)

**Files:**
- Create: `lib/supabase/migrations/ingredient_brand.sql`
- Modify: `lib/powersync/AppSchema.ts` (both ingredient tables)
- Modify: `context/NutritionContext/database/powersyncStore.ts` (export both row mappers, map + insert `brand` in both)
- Test: `context/NutritionContext/database/__tests__/powersyncStore.test.ts`

**Interfaces:**
- Consumes: existing `NutritionEntry.ingredients[].brand?: string | null` (`context/NutritionContext/types.ts:8`).
- Produces: `rowToNutritionEntry(row, ingredients)` and `rowToSavedNutritionEntry(row, ingredients)` become **exported**; both ingredient record types gain `brand`; brand round-trips through load/upsert. The PowerSync Connector needs **no change** (nutrition uses the generic `{ ...op.opData }` upsert path). Sync rules need **no change** (all data queries are `SELECT *` — see `lib/powersync/sync-rules.yaml` header note).

- [ ] **Step 1: Write the failing tests**

Append to `context/NutritionContext/database/__tests__/powersyncStore.test.ts` (and extend the import line):

```ts
import { nutritionEntryToRow, rowToNutritionEntry, rowToSavedNutritionEntry, savedNutritionEntryToRow } from '../powersyncStore'
import type { NutritionEntryIngredientRecord, NutritionEntryRecord, SavedNutritionEntryIngredientRecord, SavedNutritionEntryRecord } from '@/lib/powersync/AppSchema'
```

```ts
const entryRow = {
    id: 'e1', user_id: 'u1', name: 'Bowl', date: '2026-07-15', time: 0,
    protein: 10, carbs: 5, fats: 2, calories: 80, is_photo: 0, photo_uri: null,
    created_at: '2026-07-15T12:00:00.000Z', updated_at: '2026-07-15T12:00:00.000Z',
} as NutritionEntryRecord

const savedRow = {
    id: 's1', user_id: 'u1', name: 'Bowl', protein: 10, carbs: 5, fats: 2, calories: 80,
    is_photo: 0, photo_uri: null,
    created_at: '2026-07-15T12:00:00.000Z', updated_at: '2026-07-15T12:00:00.000Z',
} as SavedNutritionEntryRecord

function ingredientRow(overrides: Record<string, unknown> = {}): NutritionEntryIngredientRecord {
    return {
        id: 'i1', nutrition_entry_id: 'e1', name: 'Greek Yogurt', brand: 'Fage',
        quantity: 1, protein: 10, carbs: 5, fats: 2, calories: 80,
        created_at: '2026-07-15T12:00:00.000Z', ...overrides,
    } as NutritionEntryIngredientRecord
}

function savedIngredientRow(overrides: Record<string, unknown> = {}): SavedNutritionEntryIngredientRecord {
    return {
        id: 'i1', saved_nutrition_entry_id: 's1', name: 'Greek Yogurt', brand: 'Fage',
        quantity: 1, protein: 10, carbs: 5, fats: 2, calories: 80,
        created_at: '2026-07-15T12:00:00.000Z', ...overrides,
    } as SavedNutritionEntryIngredientRecord
}

describe('brand round-trip', () => {
    it('reads brand from a nutrition ingredient row', () => {
        const entry = rowToNutritionEntry(entryRow, [ingredientRow()])
        expect(entry.ingredients[0].brand).toBe('Fage')
    })

    it('maps a legacy nutrition ingredient row without brand to null', () => {
        const entry = rowToNutritionEntry(entryRow, [ingredientRow({ brand: null })])
        expect(entry.ingredients[0].brand).toBeNull()
    })

    it('reads brand from a saved ingredient row', () => {
        const entry = rowToSavedNutritionEntry(savedRow, [savedIngredientRow()])
        expect(entry.ingredients[0].brand).toBe('Fage')
    })

    it('maps a legacy saved ingredient row without brand to null', () => {
        const entry = rowToSavedNutritionEntry(savedRow, [savedIngredientRow({ brand: null })])
        expect(entry.ingredients[0].brand).toBeNull()
    })
})
```

(Note: Task 2 later renames `entry.ingredients` → `entry.items` here — expected churn, tsc will point at it.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest context/NutritionContext/database`
Expected: FAIL — `rowToNutritionEntry` is not exported (TypeError) or `brand` is `undefined`.

- [ ] **Step 3: Create the migration file** (user runs it — do NOT attempt to execute)

`lib/supabase/migrations/ingredient_brand.sql`:

```sql
-- Per-item brand persistence (universal item editor, 2026-07-15).
-- Additive + nullable: safe to run immediately; old clients ignore the column.
-- MUST be applied in Supabase BEFORE any build that writes brand ships (the
-- Connector's generic upsert sends brand in opData; a missing column would
-- wedge the upload queue). Sync rules are SELECT * — no dashboard change.
ALTER TABLE nutrition_entry_ingredients ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE saved_nutrition_entry_ingredients ADD COLUMN IF NOT EXISTS brand text;
```

- [ ] **Step 4: Add `brand` to both PowerSync tables**

In `lib/powersync/AppSchema.ts`, add `brand: column.text,` after `name` in BOTH `nutrition_entry_ingredients` (currently lines 72-83) and `saved_nutrition_entry_ingredients` (currently lines 102-113):

```ts
const nutrition_entry_ingredients = new Table({
  nutrition_entry_id: column.text,
  name: column.text,
  brand: column.text,
  quantity: column.real,
  ...
```

(same shape for `saved_nutrition_entry_ingredients`).

- [ ] **Step 5: Round-trip brand in `powersyncStore.ts`**

1. Export both read mappers: `function rowToNutritionEntry(` → `export function rowToNutritionEntry(`; same for `rowToSavedNutritionEntry`.
2. In BOTH `ingredients.map((ing) => ({ ... }))` blocks, add `brand: ing.brand ?? null,` after `name: ing.name!,`.
3. In BOTH ingredient INSERTs, add the `brand` column and bind. `upsertNutritionEntry`:

```ts
await tx.execute(
    `INSERT INTO nutrition_entry_ingredients (
       id, nutrition_entry_id, name, brand, quantity, protein, carbs, fats, calories, created_at
     ) VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [entry.id, ing.name, ing.brand ?? null, sanitizeMacro(ing.quantity), sanitizeMacro(ing.protein), sanitizeMacro(ing.carbs), sanitizeMacro(ing.fats), sanitizeMacro(ing.calories)],
)
```

`upsertSavedNutritionEntry` — identical shape with `saved_nutrition_entry_ingredients` / `saved_nutrition_entry_id`.

- [ ] **Step 6: Verify**

Run: `npx jest context/NutritionContext/database` → PASS (all, including the pre-existing sanitize tests).
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 7: Checkpoint**

Report done. Ask the user to run `ingredient_brand.sql` in the Supabase SQL editor **now** (it's additive-safe and must exist before any device testing writes a brand), and to commit.

---

### Task 2: Rename ingredient → item (code + UI vocabulary)

Purely mechanical; behavior identical. All existing tests must pass unchanged in meaning.

**Files:**
- Modify: `context/NutritionContext/types.ts`
- Rename: `context/NutritionContext/functions/ingredients.ts` → `context/NutritionContext/functions/items.ts`
- Rename: `context/NutritionContext/functions/__tests__/ingredients.test.ts` → `.../items.test.ts`
- Modify (importers/usages — let `npx tsc --noEmit` enumerate any missed): `context/NutritionContext/database/powersyncStore.ts`, `context/NutritionContext/functions/aiFunctions.tsx`, `context/NutritionContext/functions/__tests__/aiFunctions.test.ts`, `context/NutritionContext/functions/__tests__/crudFunctions.test.ts`, `context/NutritionContext/functions/__tests__/graphFunctions.test.ts`, `context/NutritionContext/database/__tests__/powersyncStore.test.ts`, `app/nutritionScreens/editPhotoEntry.tsx`, `app/nutritionScreens/savedNutritionModal.tsx`, `app/nutritionScreens/addNutritionModal.tsx`, `app/nutritionScreens/foodDBModal.tsx`, `app/nutritionScreens/analyzingModal.tsx`, `components/devTest/EditPhotoVariants.tsx`, `components/devTest/AiTest.tsx`, `components/devTest/FoodDBModalPreview.tsx`, `components/devTest/ForceSaveFailureControls.tsx`
- Modify: `CLAUDE.md` (one convention line)

**Interfaces:**
- Produces: type `Item` (was `Ingredient`), property `NutritionEntry.items: Item[]` (was `ingredients`), `sumItems` / `scaleItems` (was `sumIngredients` / `scaleIngredients`) exported from `@/context/NutritionContext/functions/items`. All later tasks use ONLY these names.
- Stays: DB tables/columns, `NutritionEntryIngredientRecord` / `SavedNutritionEntryIngredientRecord` types, SQL strings, the vision JSON key `ingredients`, `lib/supabase/functions/fetchOpenAI` (server prompt untouched).

**Rename table (apply everywhere a developer reads):**

| Old | New |
| --- | --- |
| `Ingredient` (type) | `Item` |
| `NutritionEntry.ingredients` | `NutritionEntry.items` |
| `functions/ingredients.ts` | `functions/items.ts` |
| `sumIngredients` / `scaleIngredients` | `sumItems` / `scaleItems` |
| `DraftIngredient` / `toIngredient` | `DraftItem` / `toItem` |
| `addIngredient` / `removeIngredient` (editPhotoEntry) | `addItem` / `removeItem` |
| `enrichBrandedIngredient(s)` / `rawIngredients` (aiFunctions) | `enrichBrandedItem(s)` / `rawItems` |
| local vars `ingredients` holding `Item[]` | `items` |
| UI: "Ingredients" / "Ingredient" / "Add ingredient" / "At least one ingredient is required." | "Items" / "Item" / "Add item" / "At least one item is required." |

- [ ] **Step 1: Rename the type + property with the boundary note**

`context/NutritionContext/types.ts` — replace the `Ingredient` block and the `ingredients` property:

```ts
// Item = the DB's "ingredient" row, renamed in code/UI; the tables keep their
// nutrition_entry_ingredients / saved_nutrition_entry_ingredients names to
// avoid a live-data migration. Macros are per ONE unit; quantity is the
// multiplier. A total is always macro × quantity. Item math lives in
// functions/items.ts.
export interface Item {
    name: string
    brand?: string | null
    quantity: number
    protein: number
    carbs: number
    fats: number
    calories: number
}
```

and in `NutritionEntry`: `items: Item[]` (replacing `ingredients: Ingredient[]`).

- [ ] **Step 2: Rename the math module**

Move `functions/ingredients.ts` → `functions/items.ts`; rename `sumIngredients`→`sumItems`, `scaleIngredients`→`scaleItems`, parameter/comment vocabulary to items. Move+update its test file the same way.

- [ ] **Step 3: Sweep the codebase**

Apply the rename table across every file in the list. Non-obvious spots:

1. `powersyncStore.ts` — loops become `for (const ing of entry.items)`; rename the loop var to `item`. Add this comment above `rowToNutritionEntry`:

```ts
// Item = the DB's "ingredient" row. Table/column names keep the legacy
// *_ingredients naming (no live migration); only the code vocabulary changed.
```

2. `aiFunctions.tsx` — the vision JSON stays `{ name, ingredients }` on the wire. Keep `parseVisionResponse` returning `{ name?: string; ingredients?: any[] }` and map at the boundary:

```ts
// Wire key from the vision prompt contract stays "ingredients"; in-app these are items.
let items: Item[] = Array.isArray(data.ingredients) ? data.ingredients : []
```

3. `addNutritionModal.tsx` / `foodDBModal.tsx` — `ingredients: []` → `items: []` (placeholder; Task 4 replaces these lines entirely).

- [ ] **Step 4: Add the CLAUDE.md convention line**

Under **Key Conventions**, after the Dates bullet:

```markdown
- **Item = ingredient.** Code and UI say "item"; the DB tables keep their legacy `*_ingredients` names (`nutrition_entry_ingredients`, `saved_nutrition_entry_ingredients`). Same concept — don't rename the tables.
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `npx jest` → full suite PASS.
Run: `npx tsc --noEmit` again after fixing anything, then grep `Ingredient` — remaining hits must ONLY be: `*IngredientRecord` types, SQL/table strings, `sync-rules.yaml`, the vision wire key, `fetchOpenAI` server code, and docs.

- [ ] **Step 6: Checkpoint** — report; user commits.

---

### Task 3: Entry builders — the tested core (TDD)

All name rules, item shapes, and the routing target live here as pure functions.

**Files:**
- Create: `context/NutritionContext/functions/entryBuilders.ts`
- Create: `context/NutritionContext/functions/entryRouting.ts`
- Test: `context/NutritionContext/functions/__tests__/entryBuilders.test.ts`
- Test: `context/NutritionContext/functions/__tests__/entryRouting.test.ts`

**Interfaces:**
- Consumes: `Item`, `NutritionEntry` from `../types`; `sumItems`, `scaleItems` from `./items`; `FoodItem` from `@/lib/foodDB/types` (gains `brand` in Task 4 — until then the builder reads an optional field, fine under `?.`).
- Produces (exact signatures — later tasks import these):
  - `resolveEntryName(typed: string, itemNames: string[]): string`
  - `resolveCombinedName(typed: string): string`
  - `joinItemNames(items: { name: string; quantity?: number }[]): string`
  - `itemsForEntry(entry: NutritionEntry): Item[]`
  - `entrySubtitle(items: Item[]): string | null`
  - `foodItemToItem(food: FoodItem, quantity: number): Item`
  - `buildEntryFromItems(params: { userId: string; date: Date; name: string; items: Item[]; isPhoto?: boolean; photoUri?: string }): NutritionEntry`
  - `applyEdits(entry: NutritionEntry, typedName: string, items: Item[]): NutritionEntry`
  - `editEntryHref(entry: NutritionEntry): { pathname: '/nutritionScreens/editEntry'; params: { entry: string } }`

- [ ] **Step 1: Write the failing tests**

`context/NutritionContext/functions/__tests__/entryBuilders.test.ts`:

```ts
import { Item, NutritionEntry } from '../../types'
import { applyEdits, buildEntryFromItems, entrySubtitle, foodItemToItem, itemsForEntry, joinItemNames, resolveCombinedName, resolveEntryName } from '../entryBuilders'

function item(overrides: Partial<Item> = {}): Item {
    return { name: 'Greek Yogurt', brand: 'Fage', quantity: 1, protein: 10, carbs: 5, fats: 2, calories: 80, ...overrides }
}

function entry(overrides: Partial<NutritionEntry> = {}): NutritionEntry {
    return {
        id: 'e1', userId: 'u1', name: 'Bowl', date: new Date(2026, 6, 15), time: 0,
        protein: 10, carbs: 5, fats: 2, calories: 80, isPhoto: false, items: [item()],
        createdAt: new Date(2026, 6, 15), updatedAt: new Date(2026, 6, 15), ...overrides,
    }
}

describe('resolveEntryName', () => {
    test('typed name wins', () => expect(resolveEntryName(' Lunch ', ['Yogurt'])).toBe('Lunch'))
    test('blank + single item falls back to the item name', () => expect(resolveEntryName('  ', ['Yogurt'])).toBe('Yogurt'))
    test('blank + multiple items → Unnamed Entry', () => expect(resolveEntryName('', ['A', 'B'])).toBe('Unnamed Entry'))
    test('blank + no items → Unnamed Entry (manual add)', () => expect(resolveEntryName('', [])).toBe('Unnamed Entry'))
    test('blank + single blank item name → Unnamed Entry', () => expect(resolveEntryName('', ['  '])).toBe('Unnamed Entry'))
})

describe('resolveCombinedName', () => {
    test('typed name wins', () => expect(resolveCombinedName(' Bulk lunch ')).toBe('Bulk lunch'))
    test('blank → Combined Items', () => expect(resolveCombinedName('   ')).toBe('Combined Items'))
})

describe('joinItemNames', () => {
    test('joins with + and quantity markers', () => {
        expect(joinItemNames([{ name: 'Greek Yogurt' }, { name: 'Oats', quantity: 2 }])).toBe('Greek Yogurt + Oats ×2')
    })
    test('quantity 1 gets no marker', () => expect(joinItemNames([{ name: 'Egg', quantity: 1 }])).toBe('Egg'))
    test('truncates long joins with an ellipsis at 60 chars', () => {
        const joined = joinItemNames([{ name: 'A'.repeat(40) }, { name: 'B'.repeat(40) }])
        expect(joined.length).toBe(60)
        expect(joined.endsWith('…')).toBe(true)
    })
})

describe('itemsForEntry', () => {
    test('returns existing items untouched', () => {
        const e = entry()
        expect(itemsForEntry(e)).toBe(e.items)
    })
    test('synthesizes one item from a legacy zero-item entry', () => {
        const e = entry({ items: [], name: 'Old Manual', protein: 30, carbs: 20, fats: 10, calories: 300 })
        expect(itemsForEntry(e)).toEqual([{ name: 'Old Manual', brand: null, quantity: 1, protein: 30, carbs: 20, fats: 10, calories: 300 }])
    })
})

describe('entrySubtitle', () => {
    test('single item shows its brand', () => expect(entrySubtitle([item()])).toBe('Fage'))
    test('single item without brand → null', () => expect(entrySubtitle([item({ brand: null })])).toBeNull())
    test('multiple items → "N items"', () => expect(entrySubtitle([item(), item({ name: 'Oats' })])).toBe('2 items'))
    test('no items (legacy) → null', () => expect(entrySubtitle([])).toBeNull())
})

describe('foodItemToItem', () => {
    test('carries name, brand and quantity with per-serving macros', () => {
        expect(foodItemToItem({ id: 'f1', name: 'Oikos', brand: 'Danone', calories: 90, protein: 15, carbs: 6, fats: 0 }, 2)).toEqual({
            name: 'Oikos', brand: 'Danone', quantity: 2, protein: 15, carbs: 6, fats: 0, calories: 90,
        })
    })
    test('missing/blank brand → null', () => {
        expect(foodItemToItem({ id: 'f1', name: 'Egg', calories: 74, protein: 6.29, carbs: 0.38, fats: 4.97 }, 1).brand).toBeNull()
    })
})

describe('buildEntryFromItems', () => {
    test('totals are the sum of items', () => {
        const e = buildEntryFromItems({ userId: 'u1', date: new Date(2026, 6, 15), name: 'Meal', items: [item({ quantity: 2, calories: 100, protein: 10, carbs: 5, fats: 2 })] })
        expect(e).toMatchObject({ userId: 'u1', name: 'Meal', calories: 200, protein: 20, carbs: 10, fats: 4, isPhoto: false })
        expect(e.items).toHaveLength(1)
        expect(e.id).toBeTruthy()
    })
    test('throws on zero items — every entry must have ≥1', () => {
        expect(() => buildEntryFromItems({ userId: 'u1', date: new Date(), name: 'x', items: [] })).toThrow()
    })
})

describe('applyEdits', () => {
    test('single item: entry name and item name sync to the typed name', () => {
        const out = applyEdits(entry(), 'Renamed', [item({ name: 'Old Item' })])
        expect(out.name).toBe('Renamed')
        expect(out.items[0].name).toBe('Renamed')
    })
    test('single item + blank typed name: both fall back to the item name', () => {
        const out = applyEdits(entry(), '  ', [item({ name: 'Yogurt' })])
        expect(out.name).toBe('Yogurt')
        expect(out.items[0].name).toBe('Yogurt')
    })
    test('multiple items + blank name → Unnamed Entry, item names untouched', () => {
        const out = applyEdits(entry(), '', [item({ name: 'A' }), item({ name: 'B' })])
        expect(out.name).toBe('Unnamed Entry')
        expect(out.items.map((i) => i.name)).toEqual(['A', 'B'])
    })
    test('totals recompute from the edited items', () => {
        const out = applyEdits(entry(), 'Meal', [item({ quantity: 3, calories: 100, protein: 10, carbs: 5, fats: 2 })])
        expect(out).toMatchObject({ calories: 300, protein: 30, carbs: 15, fats: 6 })
    })
})
```

`context/NutritionContext/functions/__tests__/entryRouting.test.ts`:

```ts
import { NutritionEntry } from '../../types'
import { editEntryHref } from '../entryRouting'

function entry(overrides: Partial<NutritionEntry> = {}): NutritionEntry {
    return {
        id: 'e1', userId: 'u1', name: 'Bowl', date: new Date(2026, 6, 15), time: 0,
        protein: 10, carbs: 5, fats: 2, calories: 80, isPhoto: false, items: [],
        createdAt: new Date(2026, 6, 15), updatedAt: new Date(2026, 6, 15), ...overrides,
    }
}

describe('editEntryHref', () => {
    test('every entry type routes to editEntry — no isPhoto branch', () => {
        expect(editEntryHref(entry({ isPhoto: false })).pathname).toBe('/nutritionScreens/editEntry')
        expect(editEntryHref(entry({ isPhoto: true })).pathname).toBe('/nutritionScreens/editEntry')
    })
    test('serializes the entry into params', () => {
        const e = entry()
        expect(JSON.parse(editEntryHref(e).params.entry).id).toBe('e1')
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest context/NutritionContext/functions/__tests__/entryBuilders.test.ts context/NutritionContext/functions/__tests__/entryRouting.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`context/NutritionContext/functions/entryBuilders.ts`:

```ts
import type { FoodItem } from '@/lib/foodDB/types'
import uuid from 'react-native-uuid'
import { Item, NutritionEntry } from '../types'
import { sumItems } from './items'

// Single owner of the name rules and entry/item shapes for the
// "everything is items" model (spec: 2026-07-15-universal-item-editor-design).

export function resolveEntryName(typed: string, itemNames: string[]): string {
    const t = typed.trim()
    if (t) return t
    if (itemNames.length === 1 && itemNames[0].trim()) return itemNames[0].trim()
    return 'Unnamed Entry'
}

export function resolveCombinedName(typed: string): string {
    return typed.trim() || 'Combined Items'
}

const MAX_JOINED_NAME = 60

export function joinItemNames(items: { name: string; quantity?: number }[]): string {
    const joined = items.map((i) => ((i.quantity ?? 1) > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(' + ')
    return joined.length > MAX_JOINED_NAME ? `${joined.slice(0, MAX_JOINED_NAME - 1)}…` : joined
}

// Entries created before "everything is items" have no item rows; synthesize
// one from the entry's own totals so they open cleanly in the unified editor.
export function itemsForEntry(entry: NutritionEntry): Item[] {
    if (entry.items.length > 0) return entry.items
    return [{ name: entry.name, brand: null, quantity: 1, protein: entry.protein, carbs: entry.carbs, fats: entry.fats, calories: entry.calories }]
}

// Collapsed-row subtitle: the brand when it unambiguously fits (1 item), a
// count otherwise; per-item brands live in the editor/breakdown.
export function entrySubtitle(items: Item[]): string | null {
    if (items.length === 1) return items[0].brand?.trim() || null
    if (items.length > 1) return `${items.length} items`
    return null
}

export function foodItemToItem(food: FoodItem, quantity: number): Item {
    return { name: food.name, brand: food.brand?.trim() || null, quantity, protein: food.protein, carbs: food.carbs, fats: food.fats, calories: food.calories }
}

export function buildEntryFromItems(params: { userId: string; date: Date; name: string; items: Item[]; isPhoto?: boolean; photoUri?: string }): NutritionEntry {
    if (params.items.length === 0) throw new Error('An entry requires at least one item')
    const now = new Date()
    return {
        id: uuid.v4() as string,
        userId: params.userId,
        name: params.name,
        date: new Date(params.date),
        time: now.getTime(),
        ...sumItems(params.items),
        isPhoto: params.isPhoto ?? false,
        photoUri: params.photoUri,
        items: params.items,
        createdAt: now,
        updatedAt: now,
    }
}

// Editor save: one name for single-item entries (entry name ≡ item name).
export function applyEdits(entry: NutritionEntry, typedName: string, items: Item[]): NutritionEntry {
    const name = resolveEntryName(typedName, items.map((i) => i.name))
    const synced = items.length === 1 ? [{ ...items[0], name }] : items
    return { ...entry, name, items: synced, ...sumItems(synced) }
}
```

Note: `FoodItem.brand` doesn't exist until Task 4 — if tsc complains here, add the `brand?: string | null` field to `FoodItem` in `lib/foodDB/types.ts` as part of THIS step (Task 4 then only wires the value).

`context/NutritionContext/functions/entryRouting.ts`:

```ts
import { NutritionEntry } from '../types'

// The single edit surface: every entry (manual, saved, foodDB, photo) opens editEntry.
export function editEntryHref(entry: NutritionEntry) {
    return { pathname: '/nutritionScreens/editEntry' as const, params: { entry: JSON.stringify(entry) } }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest context/NutritionContext/functions` → PASS.
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 5: Checkpoint** — report; user commits.

---

### Task 4: W2 — every add path produces items + combine-name UI

**Files:**
- Modify: `lib/foodDB/types.ts` (`FoodItem` + `brand`), `lib/foodDB/foodDB.ts` (`getFoodItem` maps it)
- Modify: `app/nutritionScreens/addNutritionModal.tsx` (`handleAddEntry`)
- Modify: `app/nutritionScreens/foodDBModal.tsx` (`handleAddAll` + combine name)
- Modify: `app/nutritionScreens/savedNutritionModal.tsx` (`handleAddAll` + combine name)
- Modify: `components/NeutralComponents/StagedSection.tsx` (optional name field)
- Create: `lib/hooks/useCombineName.ts`
- Create: `components/devTest/CombineTest.tsx`, `app/devTest/combine.tsx`
- Modify: `app/_layout.tsx`, `components/devTest/DevHub.tsx` (register the dev page)
- Test: extend `context/NutritionContext/functions/__tests__/items.test.ts`

**Interfaces:**
- Consumes: `buildEntryFromItems`, `foodItemToItem`, `resolveEntryName`, `resolveCombinedName`, `joinItemNames`, `itemsForEntry` (Task 3); `scaleItems` (Task 2).
- Produces: `FoodItem.brand?: string | null`; `useCombineName(combineItems: boolean, stagedNames: { name: string; quantity?: number }[]): readonly [string, (text: string) => void]`; `StagedSection` gains `combineName?: string` + `onCombineNameChange?: (value: string) => void`.

- [ ] **Step 1: Regression-lock brand through scaling (write test first)**

Append to `items.test.ts` (this passes immediately — `scaleItems` spreads — it's a lock, not TDD):

```ts
test('scaleItems preserves each item brand', () => {
    const scaled = scaleItems([ing({ quantity: 1, protein: 10, calories: 100 }), { ...ing({ quantity: 2 }), brand: 'Fage' }], 2)
    expect(scaled[0].brand).toBeUndefined()
    expect(scaled[1].brand).toBe('Fage')
})
```

Run: `npx jest context/NutritionContext/functions/__tests__/items.test.ts` → PASS.

- [ ] **Step 2: `FoodItem` carries brand**

`lib/foodDB/types.ts` — add to `FoodItem`:

```ts
export interface FoodItem {
  id: string;
  name: string;
  brand?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}
```

`lib/foodDB/foodDB.ts` — `getFoodItem` return gains:

```ts
    return {
        id: details.fdcId,
        name: details.name,
        brand: details.brandName?.trim() || null,
        calories: details.calories,
        protein: details.protein,
        carbs: details.carbs,
        fats: details.fats,
    }
```

(`POPULAR_FOODS` entries simply have no `brand` — `foodItemToItem` maps that to `null`.)

- [ ] **Step 3: Manual add writes one item**

`app/nutritionScreens/addNutritionModal.tsx` — imports gain `buildEntryFromItems, resolveEntryName` from `@/context/NutritionContext/functions/entryBuilders`; drop the now-unused `uuid` import. Replace `handleAddEntry`:

```ts
    const handleAddEntry = () => {
        if (parsedProtein === null || parsedCarbs === null || parsedFats === null || parsedCalories === null) return
        const name = resolveEntryName(mealName, [])
        handleAddNutrition(
            buildEntryFromItems({
                userId: userID,
                date: new Date(selectedDate),
                name,
                items: [{ name, brand: null, quantity: 1, protein: parsedProtein, carbs: parsedCarbs, fats: parsedFats, calories: parsedCalories }],
            }),
        )
        router.back()
    }
```

- [ ] **Step 4: The combine-name hook**

`lib/hooks/useCombineName.ts`:

```ts
import { joinItemNames } from '@/context/NutritionContext/functions/entryBuilders'
import { useEffect, useRef, useState } from 'react'

// Pre-fills the combined meal name from the staged items until the user edits
// it; toggling combine off resets both. Callers must useMemo `stagedNames`.
// Interaction behavior is verified on the Combine Dev Hub page (visual gate);
// the join/fallback logic itself is Jest-covered in entryBuilders.
export function useCombineName(combineItems: boolean, stagedNames: { name: string; quantity?: number }[]) {
    const [name, setName] = useState('')
    const edited = useRef(false)

    useEffect(() => {
        if (!combineItems) {
            setName('')
            edited.current = false
            return
        }
        if (!edited.current) setName(joinItemNames(stagedNames))
    }, [combineItems, stagedNames])

    const onChange = (text: string) => {
        edited.current = true
        setName(text)
    }

    return [name, onChange] as const
}
```

- [ ] **Step 5: StagedSection gains the name field**

`components/NeutralComponents/StagedSection.tsx` — add props + render (import `TextInput`):

```ts
interface StagedSectionProps {
    label: string
    count: number
    color: string
    children: React.ReactNode
    combineItems?: boolean
    onCombineItemsChange?: (value: boolean) => void
    combineName?: string
    onCombineNameChange?: (value: string) => void
}
```

After the `combineRow` block (inside the component, before `{children}`):

```tsx
            {showCombineToggle && combineItems && onCombineNameChange != null && (
                <TextInput
                    style={styles.combineNameInput}
                    value={combineName}
                    onChangeText={onCombineNameChange}
                    placeholder="Combined Items"
                    placeholderTextColor={colors.placeholder}
                />
            )}
```

New style in `makeStyles`:

```ts
        combineNameInput: {
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 12,
            paddingVertical: 9,
            fontSize: 14,
            color: colors.text,
            fontFamily: fonts.regular,
            marginBottom: 10,
        },
```

(add `StyleSheet` to the react-native import if not present — it is already imported.)

- [ ] **Step 6: FoodDB add paths write items**

`app/nutritionScreens/foodDBModal.tsx`:

1. Imports gain `buildEntryFromItems, foodItemToItem, resolveCombinedName` from `@/context/NutritionContext/functions/entryBuilders` and `useCombineName` from `@/lib/hooks/useCombineName`; drop `uuid`.
2. Add state under `combineItems`:

```ts
    const stagedNames = useMemo(() => addedItems.map((i) => ({ name: i.name, quantity: i.quantity })), [addedItems])
    const [combineName, onCombineNameChange] = useCombineName(combineItems, stagedNames)
```

3. Replace `handleAddAll`:

```ts
    function handleAddAll() {
        if (locked) {
            openGate()
            return
        }
        if (combineItems && addedItems.length >= 2) {
            handleAddNutrition(
                buildEntryFromItems({
                    userId: userID,
                    date: new Date(selectedDate),
                    name: resolveCombinedName(combineName),
                    items: addedItems.map((item) => foodItemToItem(item, item.quantity || 1)),
                }),
            )
        } else {
            for (const item of addedItems) {
                handleAddNutrition(
                    buildEntryFromItems({
                        userId: userID,
                        date: new Date(selectedDate),
                        name: item.name,
                        items: [foodItemToItem(item, item.quantity || 1)],
                    }),
                )
            }
        }
        router.back()
    }
```

4. Pass the name field through: `<StagedSection ... combineItems={combineItems} onCombineItemsChange={setCombineItems} combineName={combineName} onCombineNameChange={onCombineNameChange}>`.

- [ ] **Step 7: Saved add paths write items**

`app/nutritionScreens/savedNutritionModal.tsx`:

1. Imports: `buildEntryFromItems, itemsForEntry, resolveCombinedName` from entryBuilders, `useCombineName` from the hook (`Item` and `scaleItems` were already renamed in Task 2). KEEP the `uuid` import — it is still used for `lineId`.
2. Same `stagedNames` + `useCombineName` wiring as foodDB, with `stagedNames` mapped from staged rows:

```ts
    const stagedNames = useMemo(() => addedItems.map((row) => ({ name: row.savedItem.name, quantity: row.quantity })), [addedItems])
    const [combineName, onCombineNameChange] = useCombineName(combineItems, stagedNames)
```

3. Replace `handleAddAll`:

```ts
    async function handleAddAll() {
        if (combineItems && addedItems.length >= 2) {
            const items: Item[] = []
            for (const row of addedItems) {
                items.push(...scaleItems(itemsForEntry(row.savedItem), row.quantity))
            }
            handleAddNutrition(
                buildEntryFromItems({
                    userId: userID,
                    date: new Date(selectedDate),
                    name: resolveCombinedName(combineName),
                    items,
                }),
            )
        } else {
            for (const row of addedItems) {
                const base = row.savedItem
                handleAddNutrition(
                    buildEntryFromItems({
                        userId: userID,
                        date: new Date(selectedDate),
                        name: base.name,
                        items: scaleItems(itemsForEntry(base), row.quantity),
                        isPhoto: base.isPhoto,
                        photoUri: base.photoUri,
                    }),
                )
            }
        }
        router.back()
    }
```

(`itemsForEntry` guarantees ≥1 item even for legacy saved meals with no item rows, so totals stay = sum of items.)

4. Pass `combineName` / `onCombineNameChange` into its `StagedSection` exactly as in foodDB.

- [ ] **Step 8: Combine Dev Hub page**

`components/devTest/CombineTest.tsx`:

```tsx
import StagedSection from '@/components/NeutralComponents/StagedSection'
import { entrySubtitle, foodItemToItem, resolveCombinedName } from '@/context/NutritionContext/functions/entryBuilders'
import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import type { FoodItem } from '@/lib/foodDB/types'
import { useCombineName } from '@/lib/hooks/useCombineName'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Combine-UI harness: StagedSection with the combined-name field, driven by the
 * real useCombineName hook. Verifies: pre-fill from joined names, edits stick,
 * clear → "Combined Items" fallback, per-item brands visible, 2 vs many items.
 */
const TWO: (FoodItem & { quantity: number })[] = [
    { id: '1', name: 'Greek Yogurt', brand: 'Fage', calories: 220, protein: 22.8, carbs: 13.6, fats: 8.5, quantity: 1 },
    { id: '2', name: 'Oats', brand: null, calories: 145, protein: 6.1, carbs: 25.4, fats: 2.4, quantity: 2 },
]
const MANY: (FoodItem & { quantity: number })[] = [
    ...TWO,
    { id: '3', name: 'Natural Creamy Peanut Butter Spread', brand: 'Skippy', calories: 190, protein: 7, carbs: 7, fats: 16, quantity: 1 },
    { id: '4', name: 'Bananas', brand: null, calories: 105, protein: 1.3, carbs: 27, fats: 0.4, quantity: 1 },
    { id: '5', name: 'Whole Milk', brand: 'Horizon Organic', calories: 146, protein: 7.9, carbs: 11, fats: 7.9, quantity: 1 },
]

export default function CombineTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [scenario, setScenario] = useState<'two' | 'many'>('two')
    const [combineItems, setCombineItems] = useState(true)

    const staged = scenario === 'two' ? TWO : MANY
    const stagedNames = useMemo(() => staged.map((i) => ({ name: i.name, quantity: i.quantity })), [staged])
    const [combineName, onCombineNameChange] = useCombineName(combineItems, stagedNames)
    const items = staged.map((i) => foodItemToItem(i, i.quantity))

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Field label="Staged items">
                <Segmented value={scenario} onChange={setScenario} options={[{ label: '2 items', value: 'two' }, { label: '5 items', value: 'many' }]} />
            </Field>

            <StagedSection label="Added" count={staged.length} color={colors.nutrition} combineItems={combineItems} onCombineItemsChange={setCombineItems} combineName={combineName} onCombineNameChange={onCombineNameChange}>
                {staged.map((i) => (
                    <View key={i.id} style={styles.row}>
                        <Text style={styles.rowName}>
                            {i.name}
                            {i.quantity > 1 ? <Text style={styles.rowQty}> ×{i.quantity}</Text> : ''}
                        </Text>
                        {i.brand ? <Text style={styles.rowBrand}>{i.brand}</Text> : null}
                    </View>
                ))}
            </StagedSection>

            <Text style={styles.caption}>Entry that would be written on Add:</Text>
            <Text style={styles.result}>name: “{combineItems ? resolveCombinedName(combineName) : '(separate entries)'}”</Text>
            <Text style={styles.result}>subtitle: “{entrySubtitle(items) ?? '—'}”</Text>
            <Text style={styles.result}>items: {items.map((i) => `${i.name}${i.brand ? ` (${i.brand})` : ''} ×${i.quantity}`).join(', ')}</Text>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        row: { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginTop: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        rowName: { fontSize: 14, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        rowQty: { color: colors.nutrition, fontFamily: fonts.regular },
        rowBrand: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontStyle: 'italic', fontFamily: fonts.regular },
        caption: { fontSize: 12, color: colors.labelMuted, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 20, marginBottom: 6 },
        result: { fontSize: 13, color: colors.text, fontFamily: fonts.regular, marginBottom: 4, lineHeight: 19 },
    })
}
```

`app/devTest/combine.tsx`:

```tsx
// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function CombineRoute() {
    if (__DEV__) {
        const CombineTest = require('@/components/devTest/CombineTest').default
        return <CombineTest />
    }
    return null
}
```

Register: in `app/_layout.tsx` dev section add
`<Stack.Screen name="devTest/combine" options={{ headerShown: true, title: 'Combine', headerBackTitle: 'Back' }} />`;
in `DevHub.tsx` GROUPS → Components add `{ label: 'Combine — Staged meal name', route: '/devTest/combine' }`.

- [ ] **Step 9: Verify**

Run: `npx jest` → full suite PASS. Run: `npx tsc --noEmit` → clean.

- [ ] **Step 10: VISUAL-APPROVAL GATE (blocking)**

Ask the user to open **Dev Hub → Combine — Staged meal name** on a simulator in light AND dark and confirm: toggle on pre-fills the joined name; adding items updates it until first edit; clearing it shows the "Combined Items" fallback in the result line; brands visible per staged item. **Do not proceed until approved.** Then checkpoint (user commits).

---

### Task 5: W3 — the one editor (`editEntry`), retire `editManualEntry`

**Files:**
- Rename (file move, not git): `app/nutritionScreens/editPhotoEntry.tsx` → `app/nutritionScreens/editEntry.tsx`
- Delete: `app/nutritionScreens/editManualEntry.tsx`
- Delete: `components/devTest/EditPhotoEntryTest.tsx`, `components/devTest/EditPhotoModalHost.tsx`, `components/devTest/EditPhotoVariants.tsx`, `app/devTest/editPhotoLab.tsx`, `app/devTest/editPhotoVariant.tsx` (the issue-12 variants lab is superseded — "replace, don't duplicate")
- Create: `components/devTest/EditEntryTest.tsx`, `app/devTest/editEntry.tsx`
- Modify: `app/nutritionScreens/nutritionScreen.tsx`, `app/_layout.tsx`, `components/devTest/DevHub.tsx`

**Interfaces:**
- Consumes: `applyEdits`, `itemsForEntry`, `editEntryHref`, `sumItems`, `DraftItem`/`toDraft`/`toItem` (renamed in Task 2).
- Produces: route `/nutritionScreens/editEntry` (params: `{ entry: JSON string }`) — the ONLY entry editor. `editManualEntry` route no longer exists.

- [ ] **Step 1: Rename the screen file and update it**

Move `editPhotoEntry.tsx` → `editEntry.tsx`, then apply these changes inside:

1. Component: `export default function EditEntry() {`.
2. Legacy synthesis + copy:

```ts
    const [rows, setRows] = useState<DraftItem[]>(() => itemsForEntry(parsedEntry).map(toDraft))
```

```tsx
                <Text style={styles.title}>Edit Entry</Text>
                <Text style={styles.subtitle}>Adjust items — totals update as you type</Text>
```

(imports gain `applyEdits, itemsForEntry` from `@/context/NutritionContext/functions/entryBuilders`; `sumItems` stays for the live totals.)

3. Single-item name sync — the item card hides its own name input when there is exactly one row (the meal-name field IS the name); `addItem` materializes the synced name into row 0 before appending:

```ts
    function addItem() {
        setRows((prev) => {
            const seeded = prev.length === 1 ? [{ ...prev[0], name: name.trim() || prev[0].name }] : [...prev]
            return [...seeded, { key: uuid.v4() as string, name: '', brand: null, calories: '', protein: '', carbs: '', fats: '', quantity: '1' }]
        })
    }
```

In the row JSX, wrap the name input (keep the trash button always):

```tsx
                            <View style={styles.titleRow}>
                                {rows.length > 1 ? (
                                    <TextInput
                                        style={styles.ingName}
                                        value={row.name}
                                        onChangeText={(v) => setField(row.key, 'name', v)}
                                        placeholder="Item"
                                        placeholderTextColor={colors.placeholder}
                                        multiline
                                    />
                                ) : (
                                    <Text style={[styles.ingName, styles.ingNameSynced]} numberOfLines={2}>{name.trim() || row.name}</Text>
                                )}
                                <TouchableOpacity onPress={() => removeItem(row.key)} hitSlop={8} style={styles.trash}>
                                    <Trash2 size={14} color={colors.destructive} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
```

New style: `ingNameSynced: { color: colors.labelMuted },`.

4. Brand input per row — directly under the `titleRow` View:

```tsx
                            <TextInput
                                style={styles.brandInput}
                                value={row.brand ?? ''}
                                onChangeText={(v) => setField(row.key, 'brand', v)}
                                placeholder="Brand (optional)"
                                placeholderTextColor={colors.placeholder}
                            />
```

New style: `brandInput: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular, fontStyle: 'italic', paddingVertical: 2, marginTop: -8, marginBottom: 10 },`.
And `toItem` must emit `brand: draft.brand?.trim() || null` (adjust if Task 2 left it as a passthrough).

5. Save handler — name rules by construction:

```ts
    function handleSave() {
        handleEditNutrition(parsedEntry.id, applyEdits(parsedEntry, name, rows.map(toItem)))
        router.back()
    }
```

- [ ] **Step 2: Delete `editManualEntry.tsx`** (whole file).

- [ ] **Step 3: Routing + registration**

`app/nutritionScreens/nutritionScreen.tsx`:
- import `editEntryHref` from `@/context/NutritionContext/functions/entryRouting`.
- `handleEdit`'s Edit action becomes:

```ts
                onPress: () => router.push(editEntryHref(nutritionEntry)),
```

(delete the `const pathname = ...isPhoto...` line.)
- renderItem: `showBreakdown` for every entry, breakdown routes the same way:

```tsx
            renderItem={({ item }) => <Entry name={item.name} calories={item.calories} protein={item.protein} carbs={item.carbs} fats={item.fats} onEditPress={() => handleEdit(item)} showBreakdown onBreakdownPress={() => router.push(editEntryHref(item))} />}
```

`app/_layout.tsx` (lines 186-187): delete the `editManualEntry` screen; rename the other:

```tsx
                    <Stack.Screen name="nutritionScreens/editEntry" options={{ ...modalPresentation, headerShown: false }} />
```

Also delete the `devTest/editPhotoLab` and `devTest/editPhotoVariant` registrations and add:

```tsx
                    <Stack.Screen name="devTest/editEntry" options={{ headerShown: true, title: 'Edit Entry — Test', headerBackTitle: 'Back' }} />
```

`DevHub.tsx` GROUPS: replace `{ label: 'Edit Photo — Variants', route: '/devTest/editPhotoLab' }` with `{ label: 'Edit Entry — Unified editor', route: '/devTest/editEntry' }`.

- [ ] **Step 4: Delete the superseded variants lab**

Delete `components/devTest/EditPhotoEntryTest.tsx`, `EditPhotoModalHost.tsx`, `EditPhotoVariants.tsx`, `app/devTest/editPhotoLab.tsx`, `app/devTest/editPhotoVariant.tsx`.

- [ ] **Step 5: EditEntry Dev Hub page**

`components/devTest/EditEntryTest.tsx`:

```tsx
import { useAuth } from '@/context/AuthContext'
import { editEntryHref } from '@/context/NutritionContext/functions/entryRouting'
import { Item, NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import uuid from 'react-native-uuid'
import { Field, Segmented } from './DevControls'

/**
 * Opens the REAL editEntry screen seeded with edge-case entries. Saving writes
 * a real entry to today's log (same precedent as the FoodDB prototype) — the
 * hint below reminds the reviewer; delete test entries from the log afterward.
 */
function mk(name: string, items: Item[], extra: Partial<NutritionEntry> = {}): Omit<NutritionEntry, 'id' | 'userId'> {
    const totals = items.reduce((t, i) => ({ protein: t.protein + i.protein * i.quantity, carbs: t.carbs + i.carbs * i.quantity, fats: t.fats + i.fats * i.quantity, calories: t.calories + i.calories * i.quantity }), { protein: 0, carbs: 0, fats: 0, calories: 0 })
    return { name, date: new Date(), time: Date.now(), ...totals, isPhoto: false, items, createdAt: new Date(), updatedAt: new Date(), ...extra }
}

const it = (name: string, brand: string | null, cal: number, p: number, c: number, f: number, quantity = 1): Item => ({ name, brand, quantity, protein: p, carbs: c, fats: f, calories: cal })

const SCENARIOS: { label: string; entry: Omit<NutritionEntry, 'id' | 'userId'> }[] = [
    { label: '1 item, with brand (name sync)', entry: mk('Greek Yogurt', [it('Greek Yogurt', 'Fage', 220, 22.8, 13.6, 8.5)]) },
    { label: '1 item, no brand', entry: mk('Egg', [it('Egg', null, 74, 6.3, 0.4, 5)]) },
    { label: 'Combined — 3 items, mixed brands', entry: mk('Greek Yogurt + Oats + Peanut Butter', [it('Greek Yogurt', 'Fage', 220, 22.8, 13.6, 8.5), it('Oats', null, 145, 6.1, 25.4, 2.4, 2), it('Peanut Butter', 'Skippy', 190, 7, 7, 16)]) },
    { label: 'Many items (6), long names', entry: mk('Big Meal', [it('Natural Creamy Peanut Butter Spread With Honey', 'Skippy Natural Brand Company', 190, 7, 7, 16), it('Whole Wheat Seed Bread', null, 142, 5.5, 24.5, 3.5, 2), it('Whole Milk', 'Horizon Organic', 146, 7.9, 11, 7.9), it('Bananas', null, 105, 1.3, 27, 0.4), it('Almonds', null, 7, 0.3, 0.2, 0.6, 10), it('Salmon', null, 41, 6.1, 0, 1.7, 3)]) },
    { label: 'Legacy manual entry (0 item rows)', entry: mk('Old Manual Meal', []) },
    { label: 'Photo entry', entry: mk('Chicken Bowl', [it('Chicken Breast', null, 195, 29.6, 0, 7.7), it('White Rice', null, 204, 4.2, 44.1, 0.4)], { isPhoto: true }) },
]

export default function EditEntryTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const { userID } = useAuth()
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    function open(entry: Omit<NutritionEntry, 'id' | 'userId'>) {
        router.push(editEntryHref({ ...entry, id: uuid.v4() as string, userId: userID }) as never)
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Text style={styles.hint}>Also verify: clear the meal name and save (single item → item name; multi → “Unnamed Entry”); remove items down to the “at least one” guard; edit a brand. ⚠️ Save writes a REAL entry to today’s log — delete it afterward.</Text>
            {SCENARIOS.map((s) => (
                <TouchableOpacity key={s.label} style={styles.row} activeOpacity={0.6} onPress={() => open(s.entry)}>
                    <Text style={styles.rowLabel}>{s.label}</Text>
                    <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                </TouchableOpacity>
            ))}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        hint: { fontSize: 12, color: colors.textMuted, marginBottom: 16, marginLeft: 2, lineHeight: 16, fontFamily: fonts.regular },
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        rowLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
    })
}
```

`app/devTest/editEntry.tsx`:

```tsx
// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function EditEntryTestRoute() {
    if (__DEV__) {
        const EditEntryTest = require('@/components/devTest/EditEntryTest').default
        return <EditEntryTest />
    }
    return null
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` → clean (this catches every dangling `editManualEntry` / `editPhotoEntry` / variants-lab reference).
Run: `npx jest` → full suite PASS.
Grep `editManualEntry|editPhotoEntry` → only doc files may remain.

- [ ] **Step 7: VISUAL-APPROVAL GATE (blocking)**

User reviews **Dev Hub → Edit Entry — Unified editor** on a simulator, light AND dark, walking every scenario + the hint's interactions (blank-name save, remove-to-guard, name sync when adding a 2nd item, brand editing). **Do not proceed until approved.** Then checkpoint (user commits).

---

### Task 6: Collapsed entry rows — brand subtitle

**Files:**
- Modify: `components/NutritionComponents/Entry.tsx`, `components/NutritionComponents/SavedEntry.tsx`
- Modify: `app/nutritionScreens/nutritionScreen.tsx`, `app/nutritionScreens/savedNutritionModal.tsx` (pass subtitle)
- Create: `components/devTest/EntryRowTest.tsx`, `app/devTest/entryRow.tsx`
- Modify: `app/_layout.tsx`, `components/devTest/DevHub.tsx`

**Interfaces:**
- Consumes: `entrySubtitle(items)` (Task 3, already Jest-covered).
- Produces: `Entry` and `SavedEntry` gain `subtitle?: string | null`.

- [ ] **Step 1: Entry + SavedEntry render the subtitle**

`Entry.tsx` — add `subtitle?: string | null` to `EntryProps` and destructure it; render between the name and the calories row:

```tsx
                            <Text style={styles.name} numberOfLines={7}>
                                {name}
                            </Text>
                            {subtitle ? (
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            ) : null}
```

New style: `subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontStyle: 'italic', fontFamily: fonts.regular },`.

`SavedEntry.tsx` — same prop, same JSX right after its `name` Text, same style entry.

- [ ] **Step 2: Pass it from the screens**

`nutritionScreen.tsx` renderItem: add `subtitle={entrySubtitle(item.items)}` to `<Entry ...>` (import `entrySubtitle` from `@/context/NutritionContext/functions/entryBuilders`).
`savedNutritionModal.tsx` renderItem: add `subtitle={entrySubtitle(item.items)}` to `<SavedEntry ...>` (same import).

- [ ] **Step 3: EntryRow Dev Hub page**

`components/devTest/EntryRowTest.tsx`:

```tsx
import Entry from '@/components/NutritionComponents/Entry'
import SavedEntry from '@/components/NutritionComponents/SavedEntry'
import { entrySubtitle } from '@/context/NutritionContext/functions/entryBuilders'
import { Item } from '@/context/NutritionContext/types'
import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/** Collapsed-row scenarios: 1 item w/ brand, 1 item no brand, N items, legacy 0 items, long names. */
const it = (name: string, brand: string | null, quantity = 1): Item => ({ name, brand, quantity, protein: 10, carbs: 5, fats: 2, calories: 100 })

const CASES: { label: string; name: string; items: Item[] }[] = [
    { label: '1 item — brand subtitle', name: 'Greek Yogurt', items: [it('Greek Yogurt', 'Fage')] },
    { label: '1 item — no brand (no subtitle)', name: 'Egg', items: [it('Egg', null)] },
    { label: '3 items — "3 items"', name: 'Greek Yogurt + Oats + Peanut Butter', items: [it('Greek Yogurt', 'Fage'), it('Oats', null), it('Peanut Butter', 'Skippy')] },
    { label: 'Legacy — 0 item rows (no subtitle)', name: 'Old Manual Meal', items: [] },
    { label: 'Long names', name: 'Natural Creamy Peanut Butter Spread With Honey On Whole Wheat', items: [it('Natural Creamy Peanut Butter Spread With Honey', 'Skippy Natural Brand Company')] },
]

export default function EntryRowTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            {CASES.map((c) => (
                <View key={c.label}>
                    <Text style={styles.caption}>{c.label}</Text>
                    <Entry name={c.name} calories={520} protein={32} carbs={45} fats={18} subtitle={entrySubtitle(c.items)} onEditPress={() => {}} showBreakdown onBreakdownPress={() => {}} />
                    <View style={styles.savedWrap}>
                        <SavedEntry name={c.name} calories={520} protein={32} carbs={45} fats={18} subtitle={entrySubtitle(c.items)} onAddPress={() => {}} onDeletePress={() => {}} />
                    </View>
                </View>
            ))}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        caption: { fontSize: 12, color: colors.labelMuted, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 18, marginBottom: 4, marginLeft: 2 },
        savedWrap: { marginHorizontal: 20 },
    })
}
```

`app/devTest/entryRow.tsx` — the standard `__DEV__` stub requiring `EntryRowTest`.
Register: `_layout.tsx` → `<Stack.Screen name="devTest/entryRow" options={{ headerShown: true, title: 'Entry Rows', headerBackTitle: 'Back' }} />`; DevHub GROUPS → Components → `{ label: 'Entry Rows — Brand subtitle', route: '/devTest/entryRow' }`.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `npx jest` PASS.

- [ ] **Step 5: VISUAL-APPROVAL GATE (blocking)**

User reviews **Dev Hub → Entry Rows — Brand subtitle**, light AND dark, all five cases in both Entry and SavedEntry. **Do not proceed until approved.** Then checkpoint (user commits).

---

### Task 7: W4 — search rows show macros + brand

**Files:**
- Create: `lib/foodDB/parseFoodDescription.ts`
- Test: `lib/foodDB/__tests__/parseFoodDescription.test.ts`
- Modify: `lib/foodDB/types.ts` (`FoodSearchResult.foodDescription`)
- Modify: `lib/supabase/functions/fetchFoodDB/index.ts` (pass `food_description` through) — **user deploys**
- Modify: `app/nutritionScreens/foodDBModal.tsx` (search rows render the preview)
- Create: `components/devTest/FoodRowTest.tsx`, `app/devTest/foodRow.tsx`
- Modify: `app/_layout.tsx`, `components/devTest/DevHub.tsx`

**Interfaces:**
- Produces: `parseFoodDescription(description: string | undefined): { basis: string; calories: number; protein: number; carbs: number; fats: number } | null`. `FoodRow` needs NO change (it already renders `brandName`, `servingSize`, `macros`).
- Coordination note: Task 11 of `2026-07-15-audit-minor-fixes.md` (`useFoodSearch` hook) touches the same file's search *effect*; this task touches only the *render* of results — independent, don't merge.

- [ ] **Step 1: Write the failing parser tests**

`lib/foodDB/__tests__/parseFoodDescription.test.ts`:

```ts
import { parseFoodDescription } from '../parseFoodDescription'

describe('parseFoodDescription', () => {
    test('parses the standard FatSecret line', () => {
        expect(parseFoodDescription('Per 100g - Calories: 195kcal | Fat: 7.72g | Carbs: 0.00g | Protein: 29.55g')).toEqual({
            basis: 'Per 100g', calories: 195, fats: 7.72, carbs: 0, protein: 29.55,
        })
    })
    test('parses a non-gram serving basis', () => {
        expect(parseFoodDescription('Per 1 cup - Calories: 220kcal | Fat: 8.53g | Carbs: 13.59g | Protein: 22.79g')).toMatchObject({ basis: 'Per 1 cup', calories: 220 })
    })
    test('tolerates flexible spacing', () => {
        expect(parseFoodDescription('Per 1 bar-Calories: 190kcal |Fat: 16g| Carbs: 7g |Protein: 7g')).toMatchObject({ calories: 190, fats: 16 })
    })
    test('undefined → null (old edge function deployments)', () => {
        expect(parseFoodDescription(undefined)).toBeNull()
    })
    test('empty string → null', () => {
        expect(parseFoodDescription('')).toBeNull()
    })
    test('malformed line → null, no throw', () => {
        expect(parseFoodDescription('Chicken breast, grilled')).toBeNull()
        expect(parseFoodDescription('Per 100g - Calories: NaNkcal | Fat: g | Carbs: 0g | Protein: 0g')).toBeNull()
    })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest lib/foodDB` → FAIL (module not found).

- [ ] **Step 3: Implement the parser**

`lib/foodDB/parseFoodDescription.ts`:

```ts
export interface FoodDescriptionPreview {
    basis: string
    calories: number
    protein: number
    carbs: number
    fats: number
}

// FatSecret search results carry a one-line summary like:
//   "Per 100g - Calories: 195kcal | Fat: 7.72g | Carbs: 0.00g | Protein: 29.55g"
// Returns null when the line doesn't match — callers degrade to no preview.
const PATTERN = /^Per\s+(.+?)\s*-\s*Calories:\s*([\d.]+)\s*kcal\s*\|\s*Fat:\s*([\d.]+)\s*g\s*\|\s*Carbs:\s*([\d.]+)\s*g\s*\|\s*Protein:\s*([\d.]+)\s*g/i

export function parseFoodDescription(description: string | undefined): FoodDescriptionPreview | null {
    if (!description) return null
    const match = description.match(PATTERN)
    if (!match) return null
    const [, basis, calories, fats, carbs, protein] = match
    const parsed = { calories: Number(calories), fats: Number(fats), carbs: Number(carbs), protein: Number(protein) }
    if (Object.values(parsed).some((v) => !Number.isFinite(v))) return null
    return { basis: `Per ${basis}`, ...parsed }
}
```

Run: `npx jest lib/foodDB` → PASS.

- [ ] **Step 4: Pass the description through the pipeline**

`lib/foodDB/types.ts` — `FoodSearchResult` gains `foodDescription?: string;`.

`lib/supabase/functions/fetchFoodDB/index.ts` — the search map (lines 65-69) gains one field:

```ts
    const results = list.map((f: any) => ({
      description: f.food_name ?? "",
      fdcId: f.food_id ?? "",
      brandName: f.brand_name,
      foodDescription: f.food_description,
    }))
```

Flag for the user: deploy with `supabase functions deploy fetchFoodDB` (or the dashboard) at release. Until deployed, `foodDescription` is `undefined` and rows simply show no macro preview — graceful.

- [ ] **Step 5: Render the preview in search rows**

`app/nutritionScreens/foodDBModal.tsx` — import `parseFoodDescription`; the search-results map becomes:

```tsx
                                searchResults.map((item) => {
                                    const isAdded = !!addedItems.find((addedItem) => addedItem.id === item.fdcId)
                                    const isLoading = isLoadingDetails && selectedSearchItem?.fdcId === item.fdcId
                                    const preview = parseFoodDescription(item.foodDescription)
                                    return (
                                        <FoodRow
                                            key={item.fdcId}
                                            name={item.description}
                                            brandName={item.brandName}
                                            servingSize={preview?.basis}
                                            macros={preview ?? undefined}
                                            onAdd={() => handleAddResult(item)}
                                            added={isAdded}
                                            loading={isLoading}
                                        />
                                    )
                                })
```

(The exact per-serving numbers still resolve on add via `getFoodItem` — the row is a preview at the search basis, labeled by `servingSize`.)

- [ ] **Step 6: FoodRow Dev Hub page**

`components/devTest/FoodRowTest.tsx`:

```tsx
import FoodRow from '@/components/NutritionComponents/FoodRow'
import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { parseFoodDescription } from '@/lib/foodDB/parseFoodDescription'
import type { FoodSearchResult } from '@/lib/foodDB/types'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/** Search-row preview scenarios run through the REAL parser + FoodRow. */
const CASES: { label: string; result: FoodSearchResult }[] = [
    { label: 'Brand + macros', result: { description: 'Greek Yogurt', fdcId: '1', brandName: 'Fage', foodDescription: 'Per 100g - Calories: 97kcal | Fat: 5.00g | Carbs: 3.00g | Protein: 9.00g' } },
    { label: 'No brand', result: { description: 'Egg', fdcId: '2', foodDescription: 'Per 1 large - Calories: 74kcal | Fat: 4.97g | Carbs: 0.38g | Protein: 6.29g' } },
    { label: 'Long name', result: { description: 'Natural Creamy Peanut Butter Spread With Honey Roasted Nuts', fdcId: '3', brandName: 'Skippy Natural Brand Company', foodDescription: 'Per 2 tbsp - Calories: 190kcal | Fat: 16.00g | Carbs: 7.00g | Protein: 7.00g' } },
    { label: 'Malformed description (no preview)', result: { description: 'Chicken Breast', fdcId: '4', foodDescription: 'Grilled, boneless' } },
    { label: 'Missing description (old edge fn)', result: { description: 'White Rice', fdcId: '5' } },
]

export default function FoodRowTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            {CASES.map((c) => {
                const preview = parseFoodDescription(c.result.foodDescription)
                return (
                    <View key={c.result.fdcId}>
                        <Text style={styles.caption}>{c.label}</Text>
                        <FoodRow name={c.result.description} brandName={c.result.brandName} servingSize={preview?.basis} macros={preview ?? undefined} onAdd={() => {}} />
                    </View>
                )
            })}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        caption: { fontSize: 12, color: colors.labelMuted, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 18, marginBottom: 6, marginLeft: 2 },
    })
}
```

`app/devTest/foodRow.tsx` — the standard `__DEV__` stub requiring `FoodRowTest`.
Register: `_layout.tsx` → `<Stack.Screen name="devTest/foodRow" options={{ headerShown: true, title: 'Food Row', headerBackTitle: 'Back' }} />`; DevHub GROUPS → Components → `{ label: 'Food Row — Search preview', route: '/devTest/foodRow' }`.

- [ ] **Step 7: Verify** — `npx jest` full PASS; `npx tsc --noEmit` clean. (Edge-function file is Deno — excluded from the app's tsc; just eyeball it.)

- [ ] **Step 8: VISUAL-APPROVAL GATE (blocking)**

User reviews **Dev Hub → Food Row — Search preview**, light AND dark, all five cases (macros+brand, no brand, long name, malformed → clean row without pills). **Do not proceed until approved.** Then checkpoint (user commits).

---

### Task 8: Code-simplifier pass, full verification, docs

- [ ] **Step 1: Code-simplifier pass**

Dispatch the `code-simplifier:code-simplifier` agent over the files changed in Tasks 1–7 (list them explicitly from the working tree diff). Instruct it: preserve ALL behavior; the Jest suite is the contract; do not rename DB-boundary identifiers or touch `lib/supabase/functions/*`. Review its diff before accepting.

- [ ] **Step 2: Full verification**

Run: `npx jest` → full suite PASS.
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 3: Documentation sweep**

1. `RESTYLE_PLAN.md` (standing rule — shared primitives changed): note `StagedSection` gained the combine-name field; `Entry`/`SavedEntry` gained the brand/count `subtitle`; the editPhoto variants lab was retired in favor of the Edit Entry test page.
2. `docs/COMPLETED_ISSUES.txt`: draft the postscript entry for promoted minor #9 (brand persistence + unified editor + item rename + W4 search preview), noting the release prerequisites. Move the corresponding block out of `docs/AUDIT_MAJOR.txt`.
3. Confirm the release checklist is recorded (in the COMPLETED_ISSUES postscript and the spec):
   - Run `lib/supabase/migrations/ingredient_brand.sql` in Supabase (if not already done at Task 1) — **before** the build ships.
   - Deploy `fetchFoodDB` edge function.
   - (Pre-existing, unrelated: `nutrition_calories_real.sql` still pending.)

- [ ] **Step 4: On-device verification checklist (user, simulator)**

1. Manual add "Greek yogurt" → entry appears; Edit → opens editEntry with 1 item, one name field; rename → both entry + breakdown reflect it.
2. FoodDB: search shows macros+brand on rows (after edge deploy); add 1 branded food → entry row shows brand subtitle; Edit → item carries the brand.
3. FoodDB: stage 2+ foods, combine ON → name pre-fills joined; clear it → entry lands as "Combined Items"; entry row shows "N items"; Edit → each food its own row with its own brand.
4. Saved: combine 2 saved meals (incl. one legacy meal saved before this change) → all items present, totals correct.
5. Photo entry: unchanged flow; breakdown button now appears on ALL entries and opens editEntry.
6. Restart the app → brands still present (persistence).
7. Old entry from before this change → Edit opens with 1 synthesized item matching its totals.

- [ ] **Step 5: Final checkpoint** — report everything above; user commits.

---

## Self-review notes (spec → task map)

- Spec W1 (brand persistence + converters + tests) → Task 1. Connector/sync-rules no-change verified in code.
- Spec vocabulary rename + "item = ingredient" notes (type comment, converter comment, CLAUDE.md) → Task 2.
- Spec W2 (manual 1-item, foodDB 1-item/N-items with brands, saved keeps `scaleItems`, combined-name pre-fill/fallback, totals = sum of items) → Tasks 3–4. Legacy zero-item entries handled via `itemsForEntry` (plan addition — the spec's "always satisfiable" guard assumption only holds for NEW entries; synthesis makes it hold for old ones too).
- Spec W3 (rename file → editEntry, retire editManualEntry, routing + registration, blank name → Unnamed Entry, single-item name sync, per-item brand editing, breakdown for every entry) → Task 5 (`applyEdits` keeps the name rules Jest-covered).
- Spec collapsed-row display (brand / "N items") → Task 6 (`entrySubtitle` Jest-covered in Task 3).
- Spec W4 (edge passthrough, `FoodSearchResult` extension, client parse + FoodRow render, Task-11 coordination) → Task 7.
- Spec Testing section: Jest per workstream → Tasks 1, 3, 4, 7; Dev Hub pages + blocking approval gates → Tasks 4, 5, 6, 7. `useCombineName`'s edited-flag interaction is gate-verified rather than unit-tested (documented in the hook comment).
- User pipeline (code-simplifier → verify → COMPLETED_ISSUES postscript) → Task 8.
