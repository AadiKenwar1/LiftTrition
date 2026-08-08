// How far a suggested goal weight sits from the current one, in the user's display units. Placeholder text on
// the two goal screens only — never seeded into the field and never written to settings. Shared so onboarding
// and the adjust-nutrition wizard can't drift to different suggestions.
export const GOAL_SUGGESTION_OFFSET = { imperial: 10, metric: 5 } as const

// Weeks-to-goal estimate shared by projection, paywall, and the
// adjust-nutrition wizard. pace is in the user's display units; maintain shows
// a fixed 12-week horizon; pace ≤ 0 falls back to 1 unit/week.
export function weeksToGoal(goalType: 'lose' | 'gain' | 'maintain', currentWeight: number, goalWeight: number, pace: number): number {
    if (goalType === 'maintain') return 12
    return Math.max(1, Math.round(Math.abs(currentWeight - goalWeight) / (pace > 0 ? pace : 1)))
}
