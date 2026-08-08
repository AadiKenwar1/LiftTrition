export type OnboardingKey = 'goals' | 'obstacles' | 'activity' | 'goal' | 'aboutYou' | 'pace' | 'plan' | 'projection'

const NUMBERED: OnboardingKey[] = ['goals', 'obstacles', 'activity', 'goal', 'aboutYou', 'pace', 'plan', 'projection']

/**
 * Contiguous, skip-aware progress numbering for the onboarding dots. Pace is only meaningful when losing/
 * gaining, so on the maintain path it's skipped — but only from the goal decision onward, so pre-goal screens
 * always show the full 8 (the user hasn't committed to maintain yet). Returns a 0-based `current` + `total`.
 */
export function onboardingStep(key: OnboardingKey, goalType: 'lose' | 'gain' | 'maintain'): { current: number; total: number } {
    const goalIdx = NUMBERED.indexOf('goal')
    const keyIdx = NUMBERED.indexOf(key)
    const skipPace = goalType === 'maintain' && keyIdx > goalIdx
    const list = skipPace ? NUMBERED.filter((k) => k !== 'pace') : NUMBERED
    return { current: list.indexOf(key), total: list.length }
}
