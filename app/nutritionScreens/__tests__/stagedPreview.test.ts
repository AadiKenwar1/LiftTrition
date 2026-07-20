import { foodItemToItem, itemsForEntry } from '@/context/NutritionContext/functions/entryBuilders'
import { scaleItems, sumItems } from '@/context/NutritionContext/functions/items'
import type { Item, NutritionEntry } from '@/context/NutritionContext/types'
import type { FoodItem } from '@/lib/foodDB/types'

// Oracle: the hand-rolled per-row macro-pill math the two staging modals used to
// inline. Routing the pills through sumItems must reproduce this byte-for-byte at
// every representative quantity (this is the H9-adjacent display/commit contract).
function handRolled(cal: number, p: number, c: number, f: number, q: number) {
    return {
        calories: Math.round(cal * q),
        fats: Math.round(f * q * 10) / 10,
        carbs: Math.round(c * q * 10) / 10,
        protein: Math.round(p * q * 10) / 10,
    }
}

const QUANTITIES = [0, 1, 2.5]

describe('staged macro-pill parity (H15)', () => {
    // foodDBModal stages one per-unit FoodItem scaled by its row quantity.
    describe('foodDBModal — sumItems([foodItemToItem(item, q)])', () => {
        const food: FoodItem = { id: 'f1', name: 'Egg', calories: 74.4, protein: 6.35, carbs: 0.45, fats: 5.05 }
        QUANTITIES.forEach((q) => {
            it(`matches the hand-rolled math at q=${q}`, () => {
                expect(sumItems([foodItemToItem(food, q)])).toEqual(handRolled(food.calories, food.protein, food.carbs, food.fats, q))
            })
        })
    })

    // savedNutritionModal scales the entry's STORED totals (never its raw item rows),
    // keeping the pill pixel-identical to the saved row and to today's hand-rolled math.
    describe('savedNutritionModal — sumItems of the entry STORED totals', () => {
        const stored = { calories: 151, protein: 14.1, carbs: 7.5, fats: 4 }
        const entry = {
            id: 'e1', userId: 'u', name: 'Combo', date: new Date(), time: 0,
            ...stored, isPhoto: false,
            items: [
                { name: 'A', brand: null, quantity: 1, protein: 10.05, carbs: 5, fats: 3, calories: 100.4 },
                { name: 'B', brand: null, quantity: 1, protein: 4, carbs: 2.5, fats: 1, calories: 50.1 },
            ],
            createdAt: new Date(), updatedAt: new Date(),
        } as NutritionEntry

        QUANTITIES.forEach((q) => {
            it(`matches the hand-rolled math at q=${q}`, () => {
                const s = entry
                expect(
                    sumItems([{ name: s.name, brand: null, quantity: q, protein: s.protein, carbs: s.carbs, fats: s.fats, calories: s.calories }]),
                ).toEqual(handRolled(s.calories, s.protein, s.carbs, s.fats, q))
            })
        })

        it('re-summing raw item rows via itemsForEntry would change the displayed kcal — so the pill must NOT use it', () => {
            // Locks the adjudication: the brief's sumItems(scaleItems(itemsForEntry(s), q)) diverges
            // from the shown totals at fractional q (376 vs 378 kcal here), so it is intentionally avoided.
            const naive = sumItems(scaleItems(itemsForEntry(entry), 2.5))
            const shipped = handRolled(entry.calories, entry.protein, entry.carbs, entry.fats, 2.5)
            expect(naive.calories).not.toBe(shipped.calories)
        })
    })

    // Legacy saved meals (0 stored item rows) synthesize one item from their totals,
    // so both formulations agree there — the divergence only exists for multi-item entries.
    describe('legacy saved meal (0 item rows) — both formulations agree', () => {
        const legacy = {
            id: 'e2', userId: 'u', name: 'Old Manual', date: new Date(), time: 0,
            calories: 200, protein: 20, carbs: 10, fats: 8, isPhoto: false,
            items: [] as Item[], createdAt: new Date(), updatedAt: new Date(),
        } as NutritionEntry

        QUANTITIES.forEach((q) => {
            it(`stored-totals and itemsForEntry match at q=${q}`, () => {
                const viaStored = sumItems([{ name: legacy.name, brand: null, quantity: q, protein: legacy.protein, carbs: legacy.carbs, fats: legacy.fats, calories: legacy.calories }])
                const viaItems = sumItems(scaleItems(itemsForEntry(legacy), q))
                expect(viaStored).toEqual(viaItems)
                expect(viaStored).toEqual(handRolled(legacy.calories, legacy.protein, legacy.carbs, legacy.fats, q))
            })
        })
    })
})
