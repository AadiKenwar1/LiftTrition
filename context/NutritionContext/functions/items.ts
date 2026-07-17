import { Item } from '../types'

// Single owner of item math. Contract (see the Item type): a
// macro is the value for ONE unit; quantity is the multiplier, so a total is
// always macro × quantity. A missing quantity means 1; an explicit 0 means 0.
export function sumItems(items: Item[]) {
    let protein = 0
    let carbs = 0
    let fats = 0
    let calories = 0
    for (const item of items) {
        const quantity = item.quantity ?? 1
        protein += (item.protein || 0) * quantity
        carbs += (item.carbs || 0) * quantity
        fats += (item.fats || 0) * quantity
        calories += (item.calories || 0) * quantity
    }
    return {
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fats: Math.round(fats * 10) / 10,
        calories: Math.round(calories),
    }
}

// Scales quantity only — per-unit macros stay untouched, so totals (macro × quantity) come out N×, not N²×.
export function scaleItems(items: Item[], factor: number): Item[] {
    if (factor === 1) return items.map((item) => ({ ...item }))
    return items.map((item) => ({
        ...item,
        quantity: (item.quantity ?? 1) * factor,
    }))
}
