import { calculateStartDate, formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";
import { Settings } from "../types";
import { calculateMacros } from "./macroCalculation";

/**
 * Pure function: computes the new settings and date key after a body weight update.
 * Returns null if the weight is invalid.
 * The caller is responsible for updating state and persisting to DB.
 */
export function computeBwUpdate(
    updatedWeight: number,
    currentSettings: Settings,
): { dateKey: string; newSettings: Settings } | null {
    if (updatedWeight <= 0) return null;

    const dateKey = getDateKey(new Date());

    let goalType: 'lose' | 'gain' | 'maintain';
    if (updatedWeight > currentSettings.goalWeight) {
        goalType = 'lose';
    } else if (updatedWeight === currentSettings.goalWeight) {
        goalType = 'maintain';
    } else {
        goalType = 'gain';
    }

    const newGoalPace = currentSettings.goalType !== goalType ? 0.5 : currentSettings.goalPace;

    const updatedSettings: Settings = {
        ...currentSettings,
        bodyWeight: updatedWeight,
        goalType,
        goalPace: newGoalPace,
    };

    const isImperial = currentSettings.unitSystem === 'imperial';
    const newMacros = calculateMacros(updatedSettings, isImperial);

    return {
        dateKey,
        newSettings: {
            ...updatedSettings,
            calorieGoal: newMacros.calResult,
            proteinGoal: newMacros.proteinGrams,
            carbsGoal: newMacros.carbGrams,
            fatsGoal: newMacros.fatGrams,
        },
    };
}

/**
 * Get body weight progress data for graph (since onboarding completion, capped at the last 365 days)
 * Fills gaps with 0s for days without weight entries
 */
export function getBodyWeightProgressData(bwProgress: Record<string, number>, onboardingCompletedAt?: Date): Array<{ day: string; value: number }> {
    const maxDays = 365;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find earliest date in bwProgress
    let earliestDate: Date | null = null;
    let hasData = false;
    
    for (const dateKey of Object.keys(bwProgress)) {
        hasData = true;
        const date = new Date(dateKey + 'T00:00:00');
        date.setHours(0, 0, 0, 0);
        if (!earliestDate || date < earliestDate) {
            earliestDate = date;
        }
    }

    // Determine start date
    const startDate = calculateStartDate(today, maxDays, onboardingCompletedAt, earliestDate, hasData);
    startDate.setHours(0, 0, 0, 0);

    // Calculate days to show
    const daysToShow = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Build result array (oldest to newest, filling gaps with last known weight)
    const result: Array<{ day: string; value: number }> = [];
    let lastKnownWeight = 0; // Track last known weight
    
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(date);
        const weight = bwProgress[dateKey];
        
        // Use last known weight if no entry exists, otherwise use the entry and update last known
        if (weight !== undefined) {
            lastKnownWeight = weight;
        }
        
        result.push({
            day: formatDateMinimal(dateKey),
            value: lastKnownWeight, // Use last known weight (0 if no data yet)
        });
    }

    return result;
}