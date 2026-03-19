import { calculateStartDate, formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";
import { Dispatch, SetStateAction } from "react";
import { Settings } from "../types";
import { calculateMacros } from "./macroCalculation";

export function updateBw(updatedWeight: number, setBwProgress: Dispatch<SetStateAction<Record<string, number>>>, setSettings: Dispatch<SetStateAction<Settings>>) {
    if(updatedWeight <= 0) return;
    
    //Creates keys in the format YYYY-MM-DD
    const today = getDateKey(new Date());
    //Either adds a new entry or updates the existing one if the date already asks
    setBwProgress(prev => ({...prev, [today]: updatedWeight }));

    // Update current body weight, auto-adjust goal type, and recalculate macros
    setSettings(prev => {
        let goalType: 'lose' | 'gain' | 'maintain';
        if (updatedWeight > prev.goalWeight) {
            goalType = 'lose';
        } else if (updatedWeight === prev.goalWeight) {
            goalType = 'maintain';
        } else {
            goalType = 'gain';
        }

        // If goal type changed, set goalPace to 0.5
        const newGoalPace = prev.goalType !== goalType ? 0.5 : prev.goalPace;

        // Create updated settings with new bodyweight, goalType, and goalPace
        const updatedSettings: Settings = {
            ...prev, 
            bodyWeight: updatedWeight,
            goalType: goalType,
            goalPace: newGoalPace
        };

        // Recalculate macros based on the updated settings
        const isImperial = prev.unitSystem === 'imperial';
        const newMacros = calculateMacros(updatedSettings, isImperial);

        // Return settings with updated macros
        return {
            ...updatedSettings,
            calorieGoal: newMacros.calResult,
            proteinGoal: newMacros.proteinGrams,
            carbsGoal: newMacros.carbGrams,
            fatsGoal: newMacros.fatGrams,
        };
    });
}

/**
 * Get body weight progress data for graph (last 30 days or since onboarding completion)
 * Fills gaps with 0s for days without weight entries
 */
export function getBodyWeightProgressData(bwProgress: Record<string, number>, onboardingCompletedAt?: Date): Array<{ day: string; value: number }> {
    const maxDays = 30;
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