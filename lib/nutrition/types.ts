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
export interface NutritionEntry {
    id: string
    userId: string
    name: string
    date: Date
    time: number
    protein: number
    carbs: number
    fats: number
    calories: number
    isPhoto: boolean
    photoUri?: string
    items: Item[]
    createdAt: Date
    updatedAt: Date
}

export interface NutritionStreakState {
    loggedToday: boolean
    streakIncludingToday: number
    streakThroughYesterday: number
}
