import { Ingredient } from '../types'

// Single owner of ingredient math. Contract (see the Ingredient type): a
// macro is the value for ONE unit; quantity is the multiplier, so a total is
// always macro × quantity. A missing quantity means 1; an explicit 0 means 0.
export function sumIngredients(ingredients: Ingredient[]) {
    let protein = 0
    let carbs = 0
    let fats = 0
    let calories = 0
    for (const ingredient of ingredients) {
        const quantity = ingredient.quantity ?? 1
        protein += (ingredient.protein || 0) * quantity
        carbs += (ingredient.carbs || 0) * quantity
        fats += (ingredient.fats || 0) * quantity
        calories += (ingredient.calories || 0) * quantity
    }
    return {
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fats: Math.round(fats * 10) / 10,
        calories: Math.round(calories),
    }
}

// Scales quantity only — per-unit macros stay untouched, so totals (macro × quantity) come out N×, not N²×.
export function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
    if (factor === 1) return ingredients.map((ing) => ({ ...ing }))
    return ingredients.map((ing) => ({
        ...ing,
        quantity: (ing.quantity ?? 1) * factor,
    }))
}
