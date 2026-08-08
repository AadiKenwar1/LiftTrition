import { ThemeProvider } from '@/context/ThemeContext'
import { Text, TouchableOpacity } from 'react-native'
import { act, create } from 'react-test-renderer'

/**
 * Two screen-level guarantees. The weigh-in half: handleSave must call handleUpdateBw only when
 * the wizard's (now-editable) current weight actually differs from the stored one, so re-running
 * the wizard without touching Current doesn't stamp a same-value entry on today. The settings
 * commit itself is unconditional either way. The provider-side consequence of the call order this
 * produces (handleUpdateBw fired before the commit, not after) is pinned in
 * context/SettingsContext/__tests__/goalPrompt.test.tsx, not here.
 *
 * The projection half: the quoted weeks/date come from projectGoal against params.calorieGoal —
 * the calories actually leaving step 3, hand-edits included — never from the goalPace param, and
 * a wrong-direction plan renders "—" while Save still commits the params verbatim. The derivation
 * arithmetic itself is pinned in projectGoal.test.ts; here only the wiring is proven.
 *
 * macrosCustomized threads straight from step 3's own hand-edit detection (params.macrosCustomized)
 * into the commit, so a card actually edited there survives the next weigh-in's withRegeneratedTargets
 * the way profile.tsx's identical modal already protects it; a walk-through with no edits still
 * regenerates (default false, unchanged from before).
 */

const mockHandleUpdateBw = jest.fn()
const mockSetSettings = jest.fn()
const mockDismissTo = jest.fn()
let mockSettings: Record<string, unknown>
let mockParams: Record<string, string>

jest.mock('expo-router', () => ({
    router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args) },
    useLocalSearchParams: () => mockParams,
}))

jest.mock('@/context/SettingsContext', () => ({
    useSettings: () => ({ settings: mockSettings, setSettings: mockSetSettings, handleUpdateBw: mockHandleUpdateBw }),
}))

// Reanimated/SVG-backed chart, not under test here and not safely renderable under react-test-renderer
// (matches how PressableScale — also reanimated-backed — is stubbed in subscription.test.tsx).
jest.mock('@/components/NutritionComponents/GoalProjectionChart', () => ({ __esModule: true, default: () => null }))

jest.mock('@/lib/hooks/useScreenBottomPad', () => ({ useScreenBottomPad: () => 0 }))

type Root = ReturnType<typeof create>

// Render the real screen inside the real ThemeProvider, mirroring subscription.test.tsx's pattern.
// The screen module is require'd inside the helper so the mocks above are in place first.
function renderScreen(): Root {
    const AdjustNutrition4Screen = require('../adjustNutrition4').default
    let root: Root
    act(() => {
        root = create(
            <ThemeProvider>
                <AdjustNutrition4Screen />
            </ThemeProvider>,
        )
    })
    return root!
}

// Only one TouchableOpacity exists on this screen.
function pressSave(root: Root) {
    act(() => {
        root.root.findByType(TouchableOpacity).props.onPress()
    })
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

describe('AdjustNutrition4Screen save', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // The projection derives maintenance from the merged settings+params body, so the mock needs
        // the body facts the params never carry: gender, birthDate, activityLevel (and height).
        // M 40y · 70in · 200 lb · sedentary → maintenance 2188.12298 (hand-computed, Mifflin-St Jeor × 1.2).
        mockSettings = { bodyWeight: 200, unitSystem: 'imperial', goalType: 'lose', goalWeight: 180, gender: 'male', birthDate: birthDateForAge(40), height: 70, activityLevel: 'sedentary' }
        mockParams = {
            height: '70',
            weight: '200',
            unitSystem: 'imperial',
            goal: 'lose',
            targetWeight: '180',
            goalPace: '1',
            calorieGoal: '1688',
            proteinGoal: '150',
            carbsGoal: '200',
            fatsGoal: '60',
        }
    })

    it('logs a weigh-in when the wizard weight differs from the stored one', () => {
        mockParams = { ...mockParams, weight: '205' }
        const root = renderScreen()
        pressSave(root)

        expect(mockHandleUpdateBw).toHaveBeenCalledTimes(1)
        expect(mockHandleUpdateBw).toHaveBeenCalledWith(205)
        expect(mockSetSettings).toHaveBeenCalledWith(expect.objectContaining({ bodyWeight: 205, goalOvershootAcknowledged: false, macrosCustomized: false }))
        expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/settings')
    })

    it('skips the weigh-in when the wizard weight matches the stored one, but still commits and navigates', () => {
        // params.weight === mockSettings.bodyWeight === '200'/200: simply re-running the wizard
        // without touching Current must not stamp a same-value entry on today.
        const root = renderScreen()
        pressSave(root)

        expect(mockHandleUpdateBw).not.toHaveBeenCalled()
        expect(mockSetSettings).toHaveBeenCalledWith(expect.objectContaining({ bodyWeight: 200 }))
        expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/settings')
    })

    it('commits macrosCustomized true when step 3 flagged a hand-edited card, so the next weigh-in cannot silently discard it', () => {
        mockParams = { ...mockParams, macrosCustomized: 'true' }
        const root = renderScreen()
        pressSave(root)

        expect(mockSetSettings).toHaveBeenCalledWith(expect.objectContaining({ macrosCustomized: true }))
    })
})

describe('AdjustNutrition4Screen projection', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('quotes weeks from the calorie param, ignoring a contradicting slider pace', () => {
        // 1688 kcal against the 2188.12298 maintenance derives ≈ 1.0 lb/week → 20 weeks for the
        // 20 lb gap; the goalPace param of 3 must not shorten the quote to ~7 weeks.
        mockParams = { ...mockParams, goalPace: '3' }
        const root = renderScreen()

        expect(allText(root)).toContain('20 wk')
    })

    it('a hand-edited deeper deficit moves the quoted weeks', () => {
        // 1188 kcal → derived ≈ 2.0 lb/week → 10 weeks.
        mockParams = { ...mockParams, calorieGoal: '1188' }
        const root = renderScreen()

        expect(allText(root)).toContain('10 wk')
    })

    it('a wrong-direction plan renders "—" with the explanation instead of a date', () => {
        // 2500 kcal sits above maintenance on a lose goal: no deficit, no honest date.
        mockParams = { ...mockParams, calorieGoal: '2500' }
        const root = renderScreen()
        const text = allText(root)

        expect(text).toContain('—')
        expect(text).toContain('About your 180 lbs goal')
        expect(text.some((t) => t.includes("won't lose weight"))).toBe(true)
        expect(text.some((t) => t.includes('by '))).toBe(false)
    })

    it('a wrong-direction plan still commits the params verbatim on Save', () => {
        // The derived pace is display-only: Save writes the slider pace and the edited calories.
        mockParams = { ...mockParams, goalPace: '3', calorieGoal: '2500' }
        const root = renderScreen()
        pressSave(root)

        expect(mockSetSettings).toHaveBeenCalledWith(expect.objectContaining({ goalPace: 3, calorieGoal: 2500 }))
        expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/settings')
    })

    it('maintain keeps its fixed 12-week horizon and recomp copy', () => {
        mockParams = { ...mockParams, goal: 'maintain', targetWeight: '200', goalPace: '0', calorieGoal: '2188' }
        const root = renderScreen()
        const text = allText(root)

        expect(text).toContain('Same weight, stronger body')
        expect(text).toContain('12-week trend')
        // Exact-element check: the recomp subtitle legitimately contains an em dash mid-sentence;
        // only a standalone "—" stat/date would mean the maintain path lost its horizon.
        expect(text).not.toContain('—')
    })
})
