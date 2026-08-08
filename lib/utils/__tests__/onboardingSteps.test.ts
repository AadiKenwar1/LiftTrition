import { onboardingStep, type OnboardingKey } from '../onboardingSteps'

// The order the onboarding routes actually push each other in (app/onboardingScreens/*).
const FLOW: OnboardingKey[] = ['goals', 'obstacles', 'activity', 'goal', 'aboutYou', 'pace', 'plan', 'projection']

// The screens a user of this goal type actually sees, in order — maintain routes aboutYou → plan (aboutYou.tsx).
const visibleFlow = (goalType: 'lose' | 'gain' | 'maintain') => (goalType === 'maintain' ? FLOW.filter((k) => k !== 'pace') : FLOW)

describe('onboardingStep', () => {
    test('lose/gain walk all 8 screens', () => {
        expect(onboardingStep('goals', 'lose')).toEqual({ current: 0, total: 8 })
        expect(onboardingStep('pace', 'lose')).toEqual({ current: 5, total: 8 })
        expect(onboardingStep('projection', 'gain')).toEqual({ current: 7, total: 8 })
    })

    test('maintain still shows all 8 up to and including the goal screen — the user has not committed yet', () => {
        expect(onboardingStep('goals', 'maintain')).toEqual({ current: 0, total: 8 })
        expect(onboardingStep('activity', 'maintain')).toEqual({ current: 2, total: 8 })
        expect(onboardingStep('goal', 'maintain')).toEqual({ current: 3, total: 8 })
    })

    test('maintain drops pace from the count after the goal screen', () => {
        expect(onboardingStep('aboutYou', 'maintain')).toEqual({ current: 4, total: 7 })
        expect(onboardingStep('plan', 'maintain')).toEqual({ current: 5, total: 7 })
        expect(onboardingStep('projection', 'maintain')).toEqual({ current: 6, total: 7 })
    })

    // The whole point of the module: the dots can never repeat, skip, or overrun their own total.
    test.each(['lose', 'gain', 'maintain'] as const)('%s numbers its visible screens 0..total-1 with no gaps', (goalType) => {
        const screens = visibleFlow(goalType)
        const numbering = screens.map((key) => onboardingStep(key, goalType))
        expect(numbering.map((n) => n.current)).toEqual(screens.map((_, i) => i))
        for (const { current, total } of numbering) {
            expect(current).toBeLessThan(total)
        }
    })

    // Only the maintain path's total changes, and only once — between goal and aboutYou.
    test.each(['lose', 'gain', 'maintain'] as const)('%s never grows its total mid-flow', (goalType) => {
        const totals = visibleFlow(goalType).map((key) => onboardingStep(key, goalType).total)
        expect(totals).toEqual([...totals].sort((a, b) => b - a))
    })

    test('lose and gain are numbered identically — only maintain diverges', () => {
        for (const key of FLOW) {
            expect(onboardingStep(key, 'gain')).toEqual(onboardingStep(key, 'lose'))
        }
    })

    // Pinned, not endorsed: asking for pace on the maintain path returns current -1, which would render an
    // eyebrow reading "Step 0 of 7" and no filled dot. Unreachable today because aboutYou.tsx routes maintain
    // straight to plan — if that ever changes, this test is where it surfaces.
    test('pace on the maintain path has no position in the count', () => {
        expect(onboardingStep('pace', 'maintain')).toEqual({ current: -1, total: 7 })
    })
})
