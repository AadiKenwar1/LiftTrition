import { ThemeProvider } from '@/context/ThemeContext'
import { Text } from 'react-native'
import { act, create } from 'react-test-renderer'

/**
 * The projection screen's wiring onto projectGoal: weeks and the date derive from the committed
 * settings.calorieGoal — clamps and plan-screen hand-edits included — never from the stored slider
 * pace, a wrong-direction plan renders "—" with the explanation line, and maintain keeps its fixed
 * 12-week recomp framing. The derivation arithmetic itself is pinned in projectGoal.test.ts.
 */

let mockSettings: Record<string, unknown>

jest.mock('expo-router', () => ({
    router: { push: jest.fn(), back: jest.fn() },
}))

jest.mock('@/context/SettingsContext', () => ({
    useSettings: () => ({ settings: mockSettings }),
}))

// Reanimated/SVG-backed chart, not under test here and not safely renderable under react-test-renderer.
jest.mock('@/components/NutritionComponents/GoalProjectionChart', () => ({ __esModule: true, default: () => null }))

// The scaffold is shared onboarding chrome (safe-area + reanimated); a passthrough that renders its
// title/subtitle props as plain Text keeps the screen's own copy assertable.
jest.mock('@/components/NeutralComponents/OnboardingScaffold', () => {
    const { Text, View } = require('react-native')
    return {
        __esModule: true,
        default: ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
            <View>
                <Text>{title}</Text>
                <Text>{subtitle}</Text>
                {children}
            </View>
        ),
    }
})

type Root = ReturnType<typeof create>

// Render the real screen inside the real ThemeProvider; the module is require'd inside the helper
// so the mocks above are in place first (the adjustNutrition4.test.tsx pattern).
function renderScreen(): Root {
    const OnboardingProjection = require('../projection').default
    let root: Root
    act(() => {
        root = create(
            <ThemeProvider>
                <OnboardingProjection />
            </ThemeProvider>,
        )
    })
    return root!
}

// Flattens every Text on screen so cases can assert on rendered copy.
function allText(root: Root): string[] {
    return root.root.findAllByType(Text).map((t) => (Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children)))
}

// Mid-month, ~6 months back, minus the age — calculateAge runs on the wall clock, so an absolute
// birthDate would silently age the fixture every year and rot every hand-computed expectation.
function birthDateForAge(age: number): Date {
    const d = new Date()
    d.setDate(15)
    d.setMonth(d.getMonth() - 6)
    d.setFullYear(d.getFullYear() - age)
    return d
}

describe('OnboardingProjection', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // M 40y · 70in · 200 lb · sedentary → maintenance 2188.12298 (hand-computed, Mifflin-St Jeor × 1.2);
        // committed calorieGoal 1688 derives ≈ 1.0 lb/week → 20 weeks for the 20 lb gap.
        mockSettings = {
            gender: 'male',
            birthDate: birthDateForAge(40),
            height: 70,
            bodyWeight: 200,
            activityLevel: 'sedentary',
            unitSystem: 'imperial',
            goalType: 'lose',
            goalWeight: 180,
            goalPace: 1,
            calorieGoal: 1688,
        }
    })

    it('quotes weeks derived from the committed calorie goal', () => {
        const text = allText(renderScreen())

        expect(text).toContain('20 wk')
        expect(text.some((t) => t.includes('About 20 weeks at your pace'))).toBe(true)
    })

    it('ignores the stored slider pace — only the calorie goal drives the quote', () => {
        // A contradicting stored pace of 3 must not shorten the quote to ~7 weeks.
        mockSettings = { ...mockSettings, goalPace: 3 }
        const text = allText(renderScreen())

        expect(text).toContain('20 wk')
    })

    it('a wrong-direction plan renders "—" with the explanation instead of a date', () => {
        // 2500 kcal sits above maintenance on a lose goal: no deficit, no honest date.
        mockSettings = { ...mockSettings, calorieGoal: 2500 }
        const text = allText(renderScreen())

        expect(text).toContain('—')
        expect(text).toContain('About your 180 lbs goal')
        expect(text.some((t) => t.includes("won't lose weight"))).toBe(true)
    })

    it('maintain keeps its fixed 12-week recomp framing', () => {
        mockSettings = { ...mockSettings, goalType: 'maintain', goalWeight: 200, calorieGoal: 2188 }
        const text = allText(renderScreen())

        expect(text).toContain('Same weight, stronger body')
        expect(text).toContain('12-week trend')
        // Exact-element check: the recomp subtitle contains no standalone "—" stat/date.
        expect(text).not.toContain('—')
    })
})
