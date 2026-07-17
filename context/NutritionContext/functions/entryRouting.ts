import { NutritionEntry } from '../types'

// The single edit surface: every entry (manual, saved, foodDB, photo) opens editEntry.
export function editEntryHref(entry: NutritionEntry) {
    return { pathname: '/nutritionScreens/editEntry' as const, params: { entry: JSON.stringify(entry) } }
}
