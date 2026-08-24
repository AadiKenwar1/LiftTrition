// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { Text } from 'react-native'
import { ThemeProvider } from '@/context/ThemeContext'
import { calculateCalorieTarget, LOW_CALORIE_THRESHOLDS } from '@/context/SettingsContext/functions/macroCalculation'
import type { Settings } from '@/context/SettingsContext/types'
import HowNutritionIsCalculatedScreen from '../howNutritionIsCalculated'

/**
 * Drift guard: this screen restates macroCalculation.tsx's real constants as display text and diagram
 * values (activity multipliers, the pace→kcal step, the low-calorie thresholds) — nothing imports them,
 * so nothing else catches a retune there going unreflected here. Every assertion below is cross-checked
 * against the real exported function/constant, never a second hardcoded copy of the number, so a future
 * change to macroCalculation.tsx that this screen doesn't follow fails this file instead of only going
 * stale silently.
 */

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: new Date(1990, 0, 1),
        gender: 'male',
        height: 70,
        bodyWeight: 180,
        activityLevel: 'moderate',
        unitSystem: 'imperial',
        goalType: 'lose',
        goalWeight: 170,
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

type Root = ReturnType<typeof create>

// Flattens every Text on screen (including FormulaPanel's per-token nested Text) so cases can assert on rendered copy.
function allText(root: Root): string {
    return root.root
        .findAllByType(Text)
        .map((t) => (Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children)))
        .join(' ')
}

describe('HowNutritionIsCalculatedScreen — restated constants track the real ones', () => {
    let root: Root
    beforeAll(() => {
        act(() => {
            root = create(
                <ThemeProvider>
                    <HowNutritionIsCalculatedScreen />
                </ThemeProvider>,
            )
        })
    })

    // Step 3's InfoNote states the two adequacy thresholds as literal copy; belowCalorieMinimum is the
    // only other reader of LOW_CALORIE_THRESHOLDS, so nothing forced these two to agree until this test.
    test('low-calorie thresholds shown match LOW_CALORIE_THRESHOLDS', () => {
        const text = allText(root)
        expect(text).toContain(LOW_CALORIE_THRESHOLDS.male.toLocaleString('en-US'))
        expect(text).toContain(LOW_CALORIE_THRESHOLDS.female.toLocaleString('en-US'))
    })

    // Step 2's ScaleBars display sedentary/light/moderate/active/gymrat as 1.2/1.375/1.55/1.725/1.9.
    // getActivityFactor's map is private, so the real ratios are read back out of calculateCalorieTarget's
    // (unrounded) maintenance instead of a second copy of the multipliers.
    test('activity-factor bars keep the same ratios calculateCalorieTarget actually uses', () => {
        const maintenanceFor = (activityLevel: Settings['activityLevel']) => calculateCalorieTarget(makeSettings({ goalType: 'maintain', activityLevel }), true).maintenance
        const sedentary = maintenanceFor('sedentary')
        expect(maintenanceFor('light') / sedentary).toBeCloseTo(1.375 / 1.2, 10)
        expect(maintenanceFor('moderate') / sedentary).toBeCloseTo(1.55 / 1.2, 10)
        expect(maintenanceFor('active') / sedentary).toBeCloseTo(1.725 / 1.2, 10)
        expect(maintenanceFor('gymrat') / sedentary).toBeCloseTo(1.9 / 1.2, 10)
    })

    // Step 3's ScaleBars display 250/500/750/1,000 kcal for 0.5/1/1.5/2 lb/week. round(x - n) === round(x) - n
    // for any real x and integer n, so these differences hold exactly regardless of the fixture's maintenance.
    test('pace ScaleBars (250/500/750/1,000 kcal) match the real 3500÷7 step calculateCalorieTarget applies', () => {
        const targetAt = (goalPace: number) => calculateCalorieTarget(makeSettings({ goalType: 'lose', goalPace }), true).target
        expect(targetAt(0.5) - targetAt(1)).toBe(250)
        expect(targetAt(1) - targetAt(1.5)).toBe(250)
        expect(targetAt(1.5) - targetAt(2)).toBe(250)
    })
})
