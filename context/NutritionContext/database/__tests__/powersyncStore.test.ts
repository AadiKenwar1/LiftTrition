jest.mock('@/lib/powersync/system', () => ({ powerSync: { getAll: jest.fn(), writeTransaction: jest.fn(), execute: jest.fn() } }))

import { powerSync } from '@/lib/powersync/system'
import { nutritionEntryToRow, rowToNutritionEntry, rowToSavedNutritionEntry, savedNutritionEntryToRow, upsertNutritionEntry, upsertSavedNutritionEntry } from '../powersyncStore'
import type { NutritionEntryIngredientRecord, NutritionEntryRecord, SavedNutritionEntryIngredientRecord, SavedNutritionEntryRecord } from '@/lib/powersync/AppSchema'
import { Item, NutritionEntry } from '../../types'

function makeEntry(overrides: Partial<NutritionEntry> = {}): NutritionEntry {
    return {
        id: 'entry-1',
        userId: 'user-1',
        name: 'Chicken Salad',
        date: new Date(2026, 0, 1),
        time: 720,
        protein: 30,
        carbs: 20,
        fats: 10,
        calories: 391.50000000000006,
        isPhoto: false,
        items: [],
        createdAt: new Date(2026, 0, 1),
        updatedAt: new Date(2026, 0, 1),
        ...overrides,
    }
}

describe('nutritionEntryToRow', () => {
    it('preserves decimal calories instead of rounding to an integer', () => {
        const row = nutritionEntryToRow(makeEntry({ calories: 391.50000000000006 }))
        expect(row.calories).toBe(391.5)
    })

    it('sanitizes NaN calories to 0', () => {
        const row = nutritionEntryToRow(makeEntry({ calories: NaN }))
        expect(row.calories).toBe(0)
    })

    it('sanitizes Infinity protein to 0', () => {
        const row = nutritionEntryToRow(makeEntry({ protein: Infinity }))
        expect(row.protein).toBe(0)
    })

    it('rounds time to the nearest integer', () => {
        const row = nutritionEntryToRow(makeEntry({ time: 3.7 }))
        expect(row.time).toBe(4)
    })

    it('passes normal whole-number values through unchanged', () => {
        const row = nutritionEntryToRow(makeEntry({ time: 720, protein: 30, carbs: 20, fats: 10, calories: 400 }))
        expect(row.time).toBe(720)
        expect(row.protein).toBe(30)
        expect(row.carbs).toBe(20)
        expect(row.fats).toBe(10)
        expect(row.calories).toBe(400)
    })
})

describe('savedNutritionEntryToRow', () => {
    it('preserves decimal calories instead of rounding to an integer', () => {
        const row = savedNutritionEntryToRow(makeEntry({ calories: 391.50000000000006 }))
        expect(row.calories).toBe(391.5)
    })

    it('sanitizes NaN calories to 0', () => {
        const row = savedNutritionEntryToRow(makeEntry({ calories: NaN }))
        expect(row.calories).toBe(0)
    })

    it('sanitizes Infinity protein to 0', () => {
        const row = savedNutritionEntryToRow(makeEntry({ protein: Infinity }))
        expect(row.protein).toBe(0)
    })

    it('passes normal whole-number values through unchanged', () => {
        const row = savedNutritionEntryToRow(makeEntry({ protein: 30, carbs: 20, fats: 10, calories: 400 }))
        expect(row.protein).toBe(30)
        expect(row.carbs).toBe(20)
        expect(row.fats).toBe(10)
        expect(row.calories).toBe(400)
    })
})

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
        expect(entry.items[0].brand).toBe('Fage')
    })

    it('maps a legacy nutrition ingredient row without brand to null', () => {
        const entry = rowToNutritionEntry(entryRow, [ingredientRow({ brand: null })])
        expect(entry.items[0].brand).toBeNull()
    })

    it('reads brand from a saved ingredient row', () => {
        const entry = rowToSavedNutritionEntry(savedRow, [savedIngredientRow()])
        expect(entry.items[0].brand).toBe('Fage')
    })

    it('maps a legacy saved ingredient row without brand to null', () => {
        const entry = rowToSavedNutritionEntry(savedRow, [savedIngredientRow({ brand: null })])
        expect(entry.items[0].brand).toBeNull()
    })
})

// Wires powerSync.writeTransaction to run its callback against a mock `tx`
// with no existing row (INSERT branch), and returns that tx so a test can
// inspect the exact bind-params passed to tx.execute.
function mockInsertTransaction() {
    const tx = { getAll: jest.fn().mockResolvedValue([]), execute: jest.fn().mockResolvedValue(undefined) }
    // Param labeled `mockTx` (not `tx`) so its `typeof tx` annotation isn't self-referential.
    ;(powerSync.writeTransaction as jest.Mock).mockImplementation(async (fn: (mockTx: typeof tx) => Promise<void>) => {
        await fn(tx)
    })
    return tx
}

describe('upsertNutritionEntry / upsertSavedNutritionEntry ingredient insert (H9)', () => {
    // Real foodDB/FatSecret shape: a fractional quantity and 2-decimal
    // per-unit macros (mirrors popularFoods.ts Chicken Breast protein 29.55).
    const fractionalItem: Item = { name: 'Chicken Breast', brand: null, quantity: 0.25, protein: 29.55, carbs: 12.34, fats: 7.72, calories: 195 }

    it('stores ingredient quantity and per-unit macros at full precision', async () => {
        const tx = mockInsertTransaction()
        await upsertNutritionEntry(makeEntry({ items: [fractionalItem] }))

        const insertCall = tx.execute.mock.calls.find((call) => String(call[0]).includes('INSERT INTO nutrition_entry_ingredients'))
        expect(insertCall).toBeDefined()
        const bindParams = insertCall![1]
        // [entry.id, name, brand, quantity, protein, carbs, fats, calories]
        expect(bindParams[3]).toBe(0.25) // not sanitizeMacro's 0.3
        expect(bindParams[4]).toBe(29.55) // not sanitizeMacro's 29.6
        expect(bindParams[5]).toBe(12.34) // not sanitizeMacro's 12.3
    })

    it('stores saved-entry ingredient quantity and per-unit macros at full precision', async () => {
        const tx = mockInsertTransaction()
        await upsertSavedNutritionEntry(makeEntry({ items: [fractionalItem] }))

        const insertCall = tx.execute.mock.calls.find((call) => String(call[0]).includes('INSERT INTO saved_nutrition_entry_ingredients'))
        expect(insertCall).toBeDefined()
        const bindParams = insertCall![1]
        expect(bindParams[3]).toBe(0.25)
        expect(bindParams[4]).toBe(29.55)
        expect(bindParams[5]).toBe(12.34)
    })
})
