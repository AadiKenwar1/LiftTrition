import { getDateKey, parseDateKey } from "@/lib/utils/dateHelper";
import { buildDailySeries } from "@/lib/utils/graphSeries";
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
 * Get body weight progress data for graph (since onboarding completion, capped at the last 365 days).
 * Carries the last known weight forward for days without an entry; leading days before the first
 * weigh-in are seeded with the earliest recorded weight (not 0) so the Change stat is a true delta.
 */
export function getBodyWeightProgressData(bwProgress: Record<string, number>, onboardingCompletedAt?: Date): Array<{ day: string; value: number }> {
    // Scan every recorded weigh-in (including entries older than the 365-day display window) to
    // find the earliest date AND its weight — that weight is the true last-known value at the
    // window start, so it seeds the carry-forward instead of a fake 0.
    let earliestDate: Date | null = null;
    let earliestWeight = 0;
    let hasData = false;

    for (const [dateKey, weight] of Object.entries(bwProgress)) {
        hasData = true;
        const date = parseDateKey(dateKey);
        if (!earliestDate || date < earliestDate) {
            earliestDate = date;
            earliestWeight = weight;
        }
    }

    // Delegate the day-by-day walk to the shared helper: carry the last known weight forward,
    // seeded with the earliest recorded weight so leading days aren't a fake 0 (365-day window).
    const valuesByDate = new Map<string, number>(Object.entries(bwProgress));
    return buildDailySeries(valuesByDate, {
        maxDays: 365,
        onboardingCompletedAt,
        earliestDate,
        hasData,
        fill: 'carryForward',
        seed: earliestWeight,
    });
}