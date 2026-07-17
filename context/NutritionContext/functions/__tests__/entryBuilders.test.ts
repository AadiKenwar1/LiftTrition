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
