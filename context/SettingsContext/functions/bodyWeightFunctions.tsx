import { calculateStartDate, daysBetween, formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";
import { Settings } from "../types";
import { calculateMacros } from "./macroCalculation";

/**
 * Issue 8 rules: targets are derived, intent is owned. A weigh-in updates bodyWeight and
 * regenerates targets for the CURRENT goalType — it never flips goalType or resets pace.
 * Automation never acts, it only asks: every weigh-in at/past the goal returns a
 * 'goalReached' prompt (level-triggered — it asks again each weigh-in until answered),
 * muted once the user explicitly chose "Keep Going" (goalOvershootAcknowledged). The mute
 * lasts only while the user stays at/past goal — a weigh-in back on the pre-goal side
 * clears it, so re-reaching the goal asks again.
 */
export type BwPrompt = 'goalReached'

export function isGoalReached(s: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight'>): boolean {
    if (s.goalType === 'lose') return s.bodyWeight <= s.goalWeight
    if (s.goalType === 'gain') return s.bodyWeight >= s.goalWeight
    return false
}

// Display band only — picks which banner sentence renders; it gates no behavior.
export const GOAL_COPY_BAND = { imperial: 2, metric: 1 } as const

export function goalReachedBannerCopy(s: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight' | 'unitSystem'>): string {
    const past = Math.round((s.goalType === 'lose' ? s.goalWeight - s.bodyWeight : s.bodyWeight - s.goalWeight) * 10) / 10
    if (past < GOAL_COPY_BAND[s.unitSystem]) return 'Goal reached — set your next goal'
    const delta = Number.isInteger(past) ? String(past) : past.toFixed(1)
    return `${delta} ${s.unitSystem === 'imperial' ? 'lbs' : 'kg'} past your goal — set your next goal`
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

    const base = withRegeneratedTargets({ ...currentSettings, bodyWeight: updatedWeight })
    const reached = isGoalReached(base)

    // Keep Going mutes the ask only while the user stays at/past goal: crossing back
    // re-arms it (zero margin — the mute's edge is the banner's edge), so re-reaching
    // the goal asks again.
    const newSettings = !reached && base.goalOvershootAcknowledged ? { ...base, goalOvershootAcknowledged: false } : base

    // Prompt condition = banner condition + "hasn't said stop asking".
    const prompt: BwPrompt | null = reached && !newSettings.goalOvershootAcknowledged ? 'goalReached' : null

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
    const daysToShow = daysBetween(startDate, today) + 1;

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