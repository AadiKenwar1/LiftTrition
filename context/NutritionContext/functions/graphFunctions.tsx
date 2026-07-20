import { addDays, getDateKey, WEEKDAY_INITIALS, type WeekDayPoint } from "@/lib/utils/dateHelper";
import { buildDailySeries } from "@/lib/utils/graphSeries";
import { NutritionEntry, NutritionStreakState } from "../types";


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

    // Macro value extractor map
    const macroExtractor = {
        calories: (m: { calories: number }) => m.calories,
        protein: (m: { protein: number }) => m.protein,
        carbs: (m: { carbs: number }) => m.carbs,
        fats: (m: { fats: number }) => m.fats,
    };

    // Reduce the per-day macro buckets to the single requested macro, then delegate the
    // day-by-day gap-fill walk to the shared helper (zero-fill, 30-day window).
    const extract = macroExtractor[macroType];
    const valuesByDate = new Map<string, number>();
    for (const [dateKey, macros] of macrosByDate) {
        valuesByDate.set(dateKey, extract(macros));
    }

    return buildDailySeries(valuesByDate, {
        maxDays: 30,
        onboardingCompletedAt,
        earliestDate,
        hasData: nutritionData.length > 0,
        fill: 'zero',
    });
}

/**
 * Get macro/calorie data for a single calendar week (7 days from `weekStart`).
 * Sums the chosen macro per calendar day; days with no logs are 0; days after today are flagged isFuture.
 * Labels are weekday initials (S M T W Th F S).
 */
export function getMacroForWeek(macroType: 'calories' | 'protein' | 'carbs' | 'fats', nutritionData: NutritionEntry[], weekStart: Date): WeekDayPoint[] {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const todayKey = getDateKey(new Date());

    const macrosByDate = new Map<string, { protein: number; carbs: number; fats: number; calories: number }>();
    for (const entry of nutritionData) {
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
    }

    const macroExtractor = {
        calories: (m: { calories: number }) => m.calories,
        protein: (m: { protein: number }) => m.protein,
        carbs: (m: { carbs: number }) => m.carbs,
        fats: (m: { fats: number }) => m.fats,
    };

    const result: WeekDayPoint[] = [];
    for (let i = 0; i < 7; i++) {
        const date = addDays(start, i);
        const dateKey = getDateKey(date);
        const macros = macrosByDate.get(dateKey) || { protein: 0, carbs: 0, fats: 0, calories: 0 };
        result.push({
            day: WEEKDAY_INITIALS[date.getDay()],
            value: macroExtractor[macroType](macros),
            dateKey,
            isFuture: dateKey > todayKey,
        });
    }

    return result;
}

function countConsecutiveLoggedDays(loggedDays: Set<string>, startDate: Date): number {
    let streak = 0
    const cursor = new Date(startDate)
    cursor.setHours(0, 0, 0, 0)
    while (loggedDays.has(getDateKey(cursor))) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
    }
    return streak
}

export function getNutritionStreakState(
    nutritionData: NutritionEntry[],
    now: Date = new Date(),
): NutritionStreakState {
    const loggedDays = new Set(nutritionData.map((e) => getDateKey(new Date(e.date))))

    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const loggedToday = loggedDays.has(getDateKey(today))
    const streakIncludingToday = loggedToday ? countConsecutiveLoggedDays(loggedDays, today) : 0
    const streakThroughYesterday =
        loggedDays.has(getDateKey(yesterday)) ? countConsecutiveLoggedDays(loggedDays, yesterday) : 0

    return { loggedToday, streakIncludingToday, streakThroughYesterday }
}