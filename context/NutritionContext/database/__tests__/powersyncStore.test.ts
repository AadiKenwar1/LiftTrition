jest.mock('@/lib/powersync/system', () => ({ powerSync: { getAll: jest.fn(), writeTransaction: jest.fn(), execute: jest.fn() } }))

import { nutritionEntryToRow, savedNutritionEntryToRow } from '../powersyncStore'
import { NutritionEntry } from '../../types'

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
        ingredients: [],
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
