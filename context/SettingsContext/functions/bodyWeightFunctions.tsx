import { calculateStartDate, formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";
import { Settings } from "../types";
import { calculateMacros } from "./macroCalculation";

/**
 * Issue 8 rules: targets are derived, intent is owned. A weigh-in updates bodyWeight and
 * regenerates targets for the CURRENT goalType — it never flips goalType or resets pace.
 * Crossing the goal returns a 'goalReached' prompt (ask); only a previously-crossed user
 * drifting past the deadband gets the announced auto-switch to maintenance (act). Both are
 * suppressed once the user explicitly chose "Keep Going" (goalOvershootAcknowledged).
 */
export type BwPrompt = 'goalReached' | 'autoMaintain'

export const OVERSHOOT_DEADBAND = { imperial: 2, metric: 1 } as const

export function isGoalReached(s: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight'>): boolean {
    if (s.goalType === 'lose') return s.bodyWeight <= s.goalWeight
    if (s.goalType === 'gain') return s.bodyWeight >= s.goalWeight
    return false
}

function atOrPastGoal(s: Settings, weight: number): boolean {
    return s.goalType === 'lose' ? weight <= s.goalWeight : weight >= s.goalWeight
}

function pastDeadband(s: Settings, weight: number): boolean {
    const deadband = OVERSHOOT_DEADBAND[s.unitSystem]
    return s.goalType === 'lose' ? weight <= s.goalWeight - deadband : weight >= s.goalWeight + deadband
}

// Hand-tuned targets survive every implicit regeneration (macrosCustomized).
export function withRegeneratedTargets(s: Settings): Settings {
    if (s.macrosCustomized) return s
    const macros = calculateMacros(s, s.unitSystem === 'imperial')
    return { ...s, calorieGoal: macros.calResult, proteinGoal: macros.proteinGrams, carbsGoal: macros.carbGrams, fatsGoal: macros.fatGrams }
}

export function applySwitchToMaintenance(s: Settings): Settings {
    return withRegeneratedTargets({ ...s, goalType: 'maintain', goalOvershootAcknowledged: false })
}

/**
 * Pure function: computes the new settings, date key and any prompt to show after a body
 * weight update. Returns null if the weight is invalid.
 * The caller is responsible for updating state, persisting, and hosting the prompt UI.
 */
export function computeBwUpdate(
    updatedWeight: number,
    currentSettings: Settings,
): { dateKey: string; newSettings: Settings; prompt: BwPrompt | null } | null {
    if (updatedWeight <= 0) return null

    const dateKey = getDateKey(new Date())

    let newSettings = withRegeneratedTargets({ ...currentSettings, bodyWeight: updatedWeight })

    let prompt: BwPrompt | null = null
    if (newSettings.goalType !== 'maintain' && !newSettings.goalOvershootAcknowledged) {
        const wasPast = atOrPastGoal(currentSettings, currentSettings.bodyWeight)
        if (wasPast && pastDeadband(newSettings, updatedWeight)) {
            // Ask-before-act: the net only fires on a user who already had their chance
            // to answer (previous weigh-in was at/past goal). A single jump straight past
            // the deadband still asks via the crossing branch below.
            newSettings = applySwitchToMaintenance(newSettings)
            prompt = 'autoMaintain'
        } else if (!wasPast && atOrPastGoal(currentSettings, updatedWeight)) {
            prompt = 'goalReached'
        }
    }

    return { dateKey, newSettings, prompt }
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