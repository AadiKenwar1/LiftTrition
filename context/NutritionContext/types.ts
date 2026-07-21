import type { Item, NutritionEntry, NutritionStreakState } from '@/lib/nutrition/types'
import type { ScanMode } from '@/lib/openAI/mealImage'
import type { WeekDayPoint } from '@/lib/utils/dateHelper'

export type { Item, NutritionEntry, NutritionStreakState }

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
    handleSaveNutrition: (nutritionEntry: NutritionEntry) => Promise<string | null>
    handleUnsaveNutrition: (id: string) => Promise<void>
    handleAnalyzeAndAddPhoto: (photoUri: string, userID: string, mode?: ScanMode, shouldCommit?: () => boolean, signal?: AbortSignal) => Promise<void>
    handleGetMacrosForDate: (date: Date) => { totalProtein: number; totalCarbs: number; totalFats: number; totalCalories: number }
    handleGetMacroDataForGraph: (macroType: 'calories' | 'protein' | 'carbs' | 'fats', onboardingCompletedAt?: Date) => Array<{ day: string; value: number }>
    handleGetMacroForWeek: (macroType: 'calories' | 'protein' | 'carbs' | 'fats', weekStart: Date) => WeekDayPoint[]
    nutritionStreak: NutritionStreakState
}
