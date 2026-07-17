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
