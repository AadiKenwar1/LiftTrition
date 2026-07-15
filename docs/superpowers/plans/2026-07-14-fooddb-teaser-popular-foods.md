# Food DB Teaser + Popular Foods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new Food DB experience (popular foods + explicit search + free-user gates) as a fully working Dev Hub prototype, then migrate the proven composition into the real `foodDBModal`.

**Architecture:** Shippable primitives are built in their final homes from day one (`PromptCard` rename, `popularFoods.ts`, `FoodRow`); the Dev Hub prototype (`FoodDBTest`) composes them into a complete working screen with real API + real adds and a local Free/Premium override. Phase 1 ports that composition into `foodDBModal` keyed on real `hasPremium`.

**Tech Stack:** React Native / Expo 54, FatSecret via Supabase edge function (`lib/foodDB/foodDB.ts`), Jest + jest-expo.

**Spec:** `docs/superpowers/specs/2026-07-14-fooddb-teaser-popular-foods-design.md`

## Global Constraints

- **NO git operations.** No commits/branches/stash — the user owns version control. All changes stay in the working tree; where a step would say "commit", skip it.
- Repo conventions: no comments unless non-obvious; function components; theme tokens via `@/context/ThemeContext`; `makeStyles(colors)` + `useMemo`.
- **Free users must trigger zero API calls.** Gates fire BEFORE `getFoodSearchResults` / `getFoodItem`.
- **Upgrade CTA navigates with `router.replace('/settingsScreens/subscription')`** — never `push` from a modal route (reproduces the undismissable-modal bug fixed on the camera).
- Upsell copy (user-approved draft, byte-exact): title `Unlock the Food Database`, message `Search a million-plus foods and log macros in seconds. Upgrade to add foods straight from the database.`, CTA `Upgrade to Continue`, secondary handled by PromptCard's Go Back slot labeled via `onGoBack` (card renders "Go Back"; acceptable for prototype — revisit label only if user asks).
- Pre-existing baselines: full `npx jest --ci` has ~64 failing tests in 6 suites (env/mock issues, unrelated); `npx tsc --noEmit` has pre-existing errors. Success = no NEW failures and no tsc errors mentioning touched files.
- Phase 1 (Task 6) runs only after the user says the prototype "works well." Iteration on the prototype between Tasks 5 and 6 may adjust details; the prototype is then the source of truth and supersedes Task 6's inline code where they differ.

---

### Task 1: Rename ScanPromptCard → PromptCard (NeutralComponents)

**Files:**
- Create: `components/NeutralComponents/PromptCard.tsx` (content of `components/NutritionComponents/ScanPromptCard.tsx`, component renamed `PromptCard`, interface renamed `PromptCardProps`)
- Delete: `components/NutritionComponents/ScanPromptCard.tsx`
- Modify: `app/nutritionScreens/cameraScreen.tsx` (import), `components/devTest/ScanScreenTest.tsx` (import), `RESTYLE_PLAN.md` (registered entry: rename + new path)

**Interfaces:**
- Produces: `PromptCard` default export from `@/components/NeutralComponents/PromptCard`, props unchanged: `{ icon: React.ComponentType<any>, title: string, message: string, ctaLabel: string, onPress: () => void, onGoBack?: () => void }`. Tasks 4 and 6 import this.

- [ ] **Step 1:** Create the new file: copy `ScanPromptCard.tsx` verbatim, rename the component to `PromptCard` and its props interface to `PromptCardProps`; update its header comment to say it is the shared overlay prompt card (upsell / permission / settings) used over any screen. Delete the old file.
- [ ] **Step 2:** Update both imports (`cameraScreen.tsx`, `ScanScreenTest.tsx`) to `import PromptCard from '@/components/NeutralComponents/PromptCard'` and rename the JSX usages.
- [ ] **Step 3:** Update the `RESTYLE_PLAN.md` shared-primitives entry (path + name; keep the "fully tokenized" note).
- [ ] **Step 4:** Verify: `grep -ri "ScanPromptCard" --include="*.tsx" --include="*.ts" --include="*.md" .` → only historical docs (specs/plans/audit) may match, no source files. `npx tsc --noEmit 2>&1 | grep -iE "PromptCard|cameraScreen|ScanScreenTest"` → no output.

---

### Task 2: popularFoods data module (TDD)

**Files:**
- Create: `lib/foodDB/popularFoods.ts`
- Test: `lib/foodDB/__tests__/popularFoods.test.ts`

**Interfaces:**
- Produces: `interface PopularFood extends FoodItem { servingSize: string }` and `export const POPULAR_FOODS: PopularFood[]`. Tasks 4/6 consume both.

- [ ] **Step 1: Write the failing test** (`lib/foodDB/__tests__/popularFoods.test.ts`):

```ts
import { POPULAR_FOODS } from '../popularFoods'

describe('POPULAR_FOODS', () => {
    it('has entries', () => {
        expect(POPULAR_FOODS.length).toBeGreaterThan(0)
    })

    it('has unique ids', () => {
        const ids = POPULAR_FOODS.map((f) => f.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('every entry has a name, serving and non-negative macros', () => {
        for (const f of POPULAR_FOODS) {
            expect(f.name.trim().length).toBeGreaterThan(0)
            expect(f.servingSize.trim().length).toBeGreaterThan(0)
            expect(f.calories).toBeGreaterThan(0)
            for (const v of [f.protein, f.carbs, f.fats]) {
                expect(v).toBeGreaterThanOrEqual(0)
                expect(Number.isFinite(v)).toBe(true)
            }
        }
    })
})
```

- [ ] **Step 2:** Run `npx jest lib/foodDB/__tests__/popularFoods.test.ts` → FAIL (module not found).
- [ ] **Step 3: Minimal implementation** — placeholder entries clearly marked; replaced by the FatSecret dump in Task 5:

```ts
import { FoodItem } from './types'

export interface PopularFood extends FoodItem {
    servingSize: string
}

// PLACEHOLDER data — replaced verbatim by the one-time FatSecret dump (see Dev Hub
// "Dump popular foods" button). Do not ship before Task 5 swaps in real values.
export const POPULAR_FOODS: PopularFood[] = [
    { id: 'popular-chicken-breast', name: 'Chicken Breast', servingSize: '100 g cooked', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
    { id: 'popular-egg', name: 'Egg', servingSize: '1 large', calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8 },
    { id: 'popular-white-rice', name: 'White Rice', servingSize: '1 cup cooked', calories: 205, protein: 4.3, carbs: 44.5, fats: 0.4 },
    { id: 'popular-banana', name: 'Banana', servingSize: '1 medium', calories: 105, protein: 1.3, carbs: 27, fats: 0.4 },
    { id: 'popular-oatmeal', name: 'Oatmeal', servingSize: '1/2 cup dry', calories: 150, protein: 5, carbs: 27, fats: 3 },
]
```

- [ ] **Step 4:** Run the test → PASS (3 tests).

---

### Task 3: FoodRow shared row component

**Files:**
- Create: `components/NutritionComponents/FoodRow.tsx`

**Interfaces:**
- Produces: default export `FoodRow`, props:
  `{ name: string; brandName?: string; servingSize?: string; macros?: { calories: number; protein: number; carbs: number; fats: number }; onAdd: () => void; added?: boolean; loading?: boolean }`
- Visuals copied from `foodDBModal.tsx`'s inline result row (`styles.foodItem/foodInfo/foodName/brandName/addButton/addButtonDisabled`) plus the macro-pill row from its staged section (`styles.macroRow/macroPill/macroPillText`). `foodDBModal` keeps its inline JSX until Task 6 — this task does NOT touch it.

- [ ] **Step 1:** Create the component: surface card row; name; italic `brandName` line if present; muted `servingSize` line if present; macro pills row if `macros` present (`{cal} cal`, `{f}g F`, `{c}g C`, `{p}g P`, rounded like the staged rows); right-side circular `+` button (ActivityIndicator when `loading`, disabled style when `added || loading`). Theme tokens only; `makeStyles(colors)` + `useMemo`.
- [ ] **Step 2:** Verify: `npx tsc --noEmit 2>&1 | grep -i "FoodRow"` → no output. (Visual verification happens on the Task 4 page.)
- [ ] **Step 3:** Register `FoodRow` in `RESTYLE_PLAN.md` shared primitives (same standing rule as PromptCard).

---

### Task 4: FoodDBTest — working prototype in the Dev Hub

**Files:**
- Create: `components/devTest/FoodDBTest.tsx`
- Create: `app/devTest/foodDB.tsx` (standard stub)
- Modify: `app/_layout.tsx` (Stack.Screen `devTest/foodDB`, `headerShown: true, title: 'Food DB (Teaser)'`), `components/devTest/DevHub.tsx` (GROUPS → Components: `{ label: 'Food DB — Teaser (working)', route: '/devTest/foodDB' }`)

**Interfaces:**
- Consumes: `PromptCard` (Task 1), `POPULAR_FOODS`/`PopularFood` (Task 2), `FoodRow` (Task 3), `getFoodSearchResults`/`getFoodItem` (`@/lib/foodDB/foodDB`), `useNutrition().handleAddNutrition` + `selectedDate`, `useAuth().userID`, `useSubmitOnce`, `parseNumericInput`.
- Produces: the proven composition Task 6 ports.

Behavior (complete functional spec of the page):

- [ ] **Step 1: Controls header** — `Field label="Simulate"` + `Segmented` `Free | Premium` (local `simFree: boolean`, default Free). Below it (temporary) a "Dump popular foods" button.
- [ ] **Step 2: Search block** — TextInput (no debounce effect) + Search button; `onSubmitEditing` = same handler.

```tsx
async function runSearch() {
    if (simFree) { openGate(); return }
    const q = searchQuery.trim()
    if (!q) return
    Keyboard.dismiss()
    setIsSearching(true)
    try {
        setSearchResults(await getFoodSearchResults(q))
    } catch {
        setSearchResults([])
        Alert.alert('Search Failed', 'Unable to search the food database. Check your connection and try again.')
    } finally {
        setIsSearching(false)
    }
}
```

- [ ] **Step 3: Popular section** — when `searchQuery.trim() === ''`, render `Popular foods` section: `POPULAR_FOODS.map(f => <FoodRow name={f.name} servingSize={f.servingSize} macros={f} onAdd={() => handleAddPopular(f)} added={...} />)`. `handleAddPopular`: `if (simFree) { openGate(); return }` else straight to the quantity modal (no `getFoodItem` call — macros already local).
- [ ] **Step 4: Results section** — when a search ran: `FoodRow` per result (`name={r.description} brandName={r.brandName}`), `onAdd` = gate if `simFree`, else existing two-step (`getFoodItem` → quantity modal). Searching / no-results / start states as in foodDBModal.
- [ ] **Step 5: Gate** — `openGate()`: `Keyboard.dismiss(); setUpsellVisible(true)`. Render as last child of the root view:

```tsx
{upsellVisible && (
    <PromptCard
        icon={Database}
        title="Unlock the Food Database"
        message="Search a million-plus foods and log macros in seconds. Upgrade to add foods straight from the database."
        ctaLabel="Upgrade to Continue"
        onPress={() => router.replace('/settingsScreens/subscription')}
        onGoBack={() => setUpsellVisible(false)}
    />
)}
```

- [ ] **Step 6: Quantity modal + staging + Add All** — same mechanics as foodDBModal today (quantity modal → `addedItems` staged list with remove + combine toggle → `Add All` runs the real `handleAddNutrition` writes and shows a confirmation Alert instead of `router.back()`, so the prototype page stays open for further iteration).
- [ ] **Step 7: Dump button (temporary)** — loops a hardcoded query list (`['chicken breast','egg','white rice','brown rice','banana','oatmeal','ground beef 90/10','salmon','greek yogurt','whole milk','peanut butter','apple','broccoli','sweet potato','almonds','bread whole wheat','pasta','tuna','cottage cheese','protein powder whey']`), for each: `getFoodSearchResults(q)` → take first result → `getFoodItem(result)` → collect `{ id: 'popular-'+slug(q), name, servingSize: details?.servingSize ?? '1 serving', calories, protein, carbs, fats }`; `console.log(JSON.stringify(collected, null, 2))` and Alert "Dumped N foods to Metro console". Guard with a confirm Alert (≈40 API calls).
- [ ] **Step 8:** Register route stub + Stack.Screen + GROUPS entry (patterns identical to `scanScreen`).
- [ ] **Step 9:** Verify: `npx tsc --noEmit 2>&1 | grep -iE "FoodDBTest|devTest.foodDB"` → no output; `npx jest --ci 2>&1 | grep -E "^Tests:"` → baseline only. Then hand to user for on-device iteration.

---

### Task 5: One-time FatSecret dump → real popularFoods data (user + assistant)

- [ ] **Step 1 (user):** Dev Hub → Food DB (Teaser) → "Dump popular foods" → paste the Metro-console JSON back into the chat.
- [ ] **Step 2:** Replace `POPULAR_FOODS` placeholder entries with the dumped values verbatim (curate: drop weird brand entries, cap at ~15–20; keep ids `popular-*` unique). Remove the "PLACEHOLDER" comment.
- [ ] **Step 3:** Delete the dump button + its query list from `FoodDBTest.tsx`.
- [ ] **Step 4:** `npx jest lib/foodDB/__tests__/popularFoods.test.ts` → PASS with real data.

---

### Task 6: Phase 1 migration (ONLY after the user approves the prototype)

**Files:**
- Modify: `app/nutritionScreens/foodDBModal.tsx`, `app/(tabs)/index.tsx`, `RESTYLE_PLAN.md` (if any token/primitive changed during iteration)

**Interfaces:**
- Consumes: everything the prototype proved. The prototype file is the source of truth — port its composition, replacing the `simFree` override with `!useBilling().hasPremium`.

- [ ] **Step 1:** `foodDBModal.tsx`: remove the debounced search effect; port search button + `runSearch`; render Popular section (empty query) via `FoodRow`; replace inline result rows with `FoodRow`; add gates (`+` and Search when `!hasPremium`) → `PromptCard` overlay (same copy; CTA `router.replace`, Go Back closes overlay); popular `+` skips `getFoodItem`; `handleAddAll` keeps `router.back()` here (real modal closes after adding) and gains a defensive `hasPremium` guard.
- [ ] **Step 2:** `app/(tabs)/index.tsx`: Food DB FAB always `router.push('/nutritionScreens/foodDBModal')`; delete the now-dead `nutritionUnavailableFabButtons` style (pre-existing dead `workoutUnavailableFabButtons` may be cleaned in the same pass, flagged separately to the user).
- [ ] **Step 3:** Verify: tsc filtered to touched files → clean; full jest → baseline only. Device checklist from the spec (force-free ON/OFF, both themes). Run code-simplifier scoped to the changed files.
- [ ] **Step 4 (user):** Device verification per spec checklist. Prototype page remains in the Dev Hub as the ongoing harness.
