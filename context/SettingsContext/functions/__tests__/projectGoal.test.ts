import { weeksToGoal } from '@/lib/utils/goalMath'
import type { Settings } from '../../types'
import { projectGoal } from '../goalProjection'

// Every case pins a reference value computed by hand from Mifflin-St Jeor
// (BMR = 10·kg + 6.25·cm − 5·age + 5 male / − 161 female, × activity factor)
// and the 500 kcal/day ≈ 1 lb/week identity, never by running the function.

// Wrapped so the null path can assert weeksToGoal was never reached — feeding it a pace of 0
// would trip its pace > 0 fallback and fabricate a 1 lb/week date.
jest.mock('@/lib/utils/goalMath', () => {
    const actual = jest.requireActual('@/lib/utils/goalMath')
    return { ...actual, weeksToGoal: jest.fn(actual.weeksToGoal) }
})

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: birthDateForAge(40),
        gender: 'male',
        height: 70,
        bodyWeight: 200,
        activityLevel: 'sedentary',
        unitSystem: 'imperial',
        goalType: 'lose',
        goalWeight: 180,
        goalPace: 1,
        calorieGoal: 0,
        proteinGoal: 0,
        carbsGoal: 0,
        fatsGoal: 0,
        macrosCustomized: false,
        goalOvershootAcknowledged: false,
        ...overrides,
    }
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

// The date label the function should produce for a given week count, computed with the same
// calendar arithmetic but independently of the module under test.
function expectedDate(weeks: number): string {
    const d = new Date()
    d.setDate(d.getDate() + weeks * 7)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

beforeEach(() => {
    ;(weeksToGoal as jest.Mock).mockClear()
})

// Base body: M 40y · 70in · 200 lb · sedentary — kg = 200/2.20462 = 90.71858, cm = 177.8,
// BMR = 907.18582 + 1111.25 − 200 + 5 = 1823.43582, × 1.2 = 2188.12298 maintenance.

describe('projectGoal lose', () => {
    test('slider round-trip: the target the slider produced quotes the slider pace', () => {
        // Pace 1.0 → target round(2188.12298 − 500) = 1688; derived back = 500.12298/500 = 1.00025;
        // weeks = round(20 / 1.00025) = 20 — identical to the old stored-pace quote.
        const { weeks, targetDate, paceWeight } = projectGoal(makeSettings(), 1688)
        expect(weeks).toBe(20)
        expect(paceWeight).toBeCloseTo(1.00025, 4)
        expect(targetDate).toBe(expectedDate(20))
    })

    test('a hand-edited target moves the quote: deeper deficit, sooner date', () => {
        // 1188 kcal → derived (2188.12298 − 1188)/500 = 2.00025 → weeks = round(20/2.00025) = 10.
        expect(projectGoal(makeSettings(), 1188).weeks).toBe(10)
    })

    test('the stored slider pace is ignored — only the calorie number drives the quote', () => {
        // Same 1688 target with a contradicting goalPace of 3 still quotes 20 weeks.
        expect(projectGoal(makeSettings({ goalPace: 3 }), 1688).weeks).toBe(20)
    })

    test('calories above maintenance: no date, no weeksToGoal call', () => {
        const { weeks, targetDate, paceWeight } = projectGoal(makeSettings(), 2500)
        expect(weeks).toBeNull()
        expect(targetDate).toBe('—')
        expect(paceWeight).toBe(0)
        expect(weeksToGoal).not.toHaveBeenCalled()
    })

    test('one kcal above maintenance is already wrong-direction', () => {
        // Maintenance 2188.12298 → 2189 leaves no deficit; derived clamps to 0.
        expect(projectGoal(makeSettings(), 2189).weeks).toBeNull()
    })

    test('any positive deficit, however tiny, still quotes a long honest date', () => {
        // 2188 sits 0.12298 kcal under maintenance → derived 0.000246 lb/week: an enormous but
        // real week count, never the fallback's fabricated 20.
        const { weeks } = projectGoal(makeSettings(), 2188)
        expect(weeks).not.toBeNull()
        expect(weeks!).toBeGreaterThan(1000)
    })
})

describe('projectGoal gain', () => {
    test('an honest surplus quotes its derived weeks', () => {
        // Pace 1.0 surplus → target round(2188.12298 + 500) = 2688; derived (2688 − 2188.12298)/500
        // = 0.99975 → weeks = round(20/0.99975) = 20.
        const { weeks } = projectGoal(makeSettings({ goalType: 'gain', goalWeight: 220 }), 2688)
        expect(weeks).toBe(20)
    })

    test('calories at or below maintenance on a bulk: no date', () => {
        const { weeks, targetDate } = projectGoal(makeSettings({ goalType: 'gain', goalWeight: 220 }), 2000)
        expect(weeks).toBeNull()
        expect(targetDate).toBe('—')
        expect(weeksToGoal).not.toHaveBeenCalled()
    })
})

describe('projectGoal maintain', () => {
    test('maintain keeps the fixed 12-week horizon whatever the calories say', () => {
        // Maintain quotes no pace-based date; the 12-week chart horizon survives even an absurd
        // calorie number, and paceWeight is 0 by definition.
        const low = projectGoal(makeSettings({ goalType: 'maintain', goalWeight: 200 }), 1200)
        const high = projectGoal(makeSettings({ goalType: 'maintain', goalWeight: 200 }), 3000)
        expect(low.weeks).toBe(12)
        expect(high.weeks).toBe(12)
        expect(low.paceWeight).toBe(0)
        expect(low.targetDate).toBe(expectedDate(12))
    })
})

describe('projectGoal metric', () => {
    test('the derived lb pace converts to kg before the weeks division', () => {
        // M 40y · 178cm · 90kg · sedentary: BMR = 900 + 1112.5 − 200 + 5 = 1817.5, × 1.2 = 2181.
        // 1681 kcal → derived exactly 1.0 lb/week → lbsToKg rounds to 0.5 kg/week →
        // weeks = round(9 kg / 0.5) = 18 (an unconverted pace would misquote 9 weeks).
        const metricBody = makeSettings({ unitSystem: 'metric', height: 178, bodyWeight: 90, goalWeight: 81 })
        expect(projectGoal(metricBody, 1681).weeks).toBe(18)
    })

    test('a real but sub-0.1kg pace that rounds to 0 renders "—" instead of falling back to 1 kg/week', () => {
        // Same body, maintenance 2181. 2171 kcal → derived 10/500 = 0.02 lb/week (honestly positive), but
        // lbsToKg(0.02) rounds to 0.0 kg/week: the guard must key off the rounded display pace, not the raw
        // lb one, or weeksToGoal's pace > 0 fallback fabricates round(9/1) = 9 weeks from a near-zero deficit.
        const metricBody = makeSettings({ unitSystem: 'metric', height: 178, bodyWeight: 90, goalWeight: 81 })
        const { weeks, targetDate } = projectGoal(metricBody, 2171)
        expect(weeks).toBeNull()
        expect(targetDate).toBe('—')
        expect(weeksToGoal).not.toHaveBeenCalled()
    })
})
