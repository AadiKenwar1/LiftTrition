import type { ScanMode } from '@/lib/openAI/mealImage'
import type { WeekDayPoint } from '@/lib/utils/dateHelper'

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

export interface NutritionContextInterface {
    nutritionData: NutritionEntry[]
    savedNutritionEntries: NutritionEntry[]
    selectedDate: Date
    loaded: boolean
    loadFailed: boolean
    retryLoad: () => void
    setSelectedDate: (date: Date) => void
    handleAddNutrition: (nutritionEntry: NutritionEntry) => Promise<void>
    handleDeleteNutrition: (id: string) => Promise<void>
    handleEditNutrition: (id: string, nutritionEntry: NutritionEntry) => Promise<void>
    handleSaveNutrition: (nutritionEntry: NutritionEntry) => Promise<void>
    handleUnsaveNutrition: (id: string) => Promise<void>
    handleAnalyzeAndAddPhoto: (photoUri: string, userID: string, mode?: ScanMode, shouldCommit?: () => boolean, signal?: AbortSignal) => Promise<void>
    handleGetMacrosForDate: (date: Date) => { totalProtein: number; totalCarbs: number; totalFats: number; totalCalories: number }
    handleGetMacroDataForGraph: (macroType: 'calories' | 'protein' | 'carbs' | 'fats', onboardingCompletedAt?: Date) => Array<{ day: string; value: number }>
    handleGetMacroForWeek: (macroType: 'calories' | 'protein' | 'carbs' | 'fats', weekStart: Date) => WeekDayPoint[]
    nutritionStreak: NutritionStreakState
}
