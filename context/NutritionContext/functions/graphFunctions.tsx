import { calculateStartDate, formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";
import { NutritionEntry } from "../types";


export function getMacrosForDate(nutritionData: NutritionEntry[], date: Date){
    const dateKey = getDateKey(date)
    return nutritionData.reduce(
        (sum, entry) => {
            if (getDateKey(entry.date) === dateKey) {
                return {
                    totalProtein: sum.totalProtein + entry.protein,
                    totalCarbs: sum.totalCarbs + entry.carbs,
                    totalFats: sum.totalFats + entry.fats,
                    totalCalories: sum.totalCalories + entry.calories,
                };
            }
            return sum;
        },
        { totalProtein: 0, totalCarbs: 0, totalFats: 0, totalCalories: 0 }
    );
}

// Get macro data for graph (last 30 days or since onboarding completion) - fills gaps with 0s for days without logs
export function getMacroDataForGraph(macroType: 'calories' | 'protein' | 'carbs' | 'fats',  nutritionData: NutritionEntry[], onboardingCompletedAt?: Date): Array<{ day: string; value: number }> {
    const maxDays = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day    
    const macrosByDate = new Map<string, { protein: number; carbs: number; fats: number; calories: number }>();
    let earliestDate: Date | null = null;

    for (const entry of nutritionData) {
        // Normalize entry date to start of day for consistent date keys
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(entryDate);
        
        const existing = macrosByDate.get(dateKey) || { protein: 0, carbs: 0, fats: 0, calories: 0 };
        macrosByDate.set(dateKey, {
            protein: existing.protein + entry.protein,
            carbs: existing.carbs + entry.carbs,
            fats: existing.fats + entry.fats,
            calories: existing.calories + entry.calories,
        });
        
        // Track earliest date in single pass
        if (!earliestDate || entryDate < earliestDate) {
            earliestDate = entryDate;
        }
    }
    
    // Determine start date
    const startDate = calculateStartDate(today, maxDays, onboardingCompletedAt, earliestDate, nutritionData.length > 0);
    startDate.setHours(0, 0, 0, 0);
    
    // Calculate days to show
    const daysToShow = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Macro value extractor map
    const macroExtractor = {
        calories: (m: { calories: number }) => m.calories,
        protein: (m: { protein: number }) => m.protein,
        carbs: (m: { carbs: number }) => m.carbs,
        fats: (m: { fats: number }) => m.fats,
    };
    
    // Build result array (oldest to newest)
    const result: Array<{ day: string; value: number }> = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0); // Ensure normalization
        const dateKey = getDateKey(date);
        const macros = macrosByDate.get(dateKey) || { protein: 0, carbs: 0, fats: 0, calories: 0 };
        
        result.push({
            day: formatDateMinimal(dateKey),
            value: macroExtractor[macroType](macros),
        });
    }

    return result;
}