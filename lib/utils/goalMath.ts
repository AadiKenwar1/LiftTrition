// Weeks-to-goal estimate shared by projection, paywall, and the
// adjust-nutrition wizard. pace is in the user's display units; maintain shows
// a fixed 12-week horizon; pace ≤ 0 falls back to 1 unit/week.
export function weeksToGoal(goalType: 'lose' | 'gain' | 'maintain', currentWeight: number, goalWeight: number, pace: number): number {
    if (goalType === 'maintain') return 12
    return Math.max(1, Math.round(Math.abs(currentWeight - goalWeight) / (pace > 0 ? pace : 1)))
}
