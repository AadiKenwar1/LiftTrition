import { ThemeProvider } from '@/context/ThemeContext'
import { act, create } from 'react-test-renderer'
import DailyIntakeCard from '../DailyIntakeCard'

jest.mock('@/context/NutritionContext', () => ({
    useNutrition: () => ({
        handleGetMacrosForDate: () => ({ totalCalories: 1500, totalFats: 84, totalCarbs: 210, totalProtein: 130 }),
    }),
}))

jest.mock('@/context/SettingsContext', () => ({
    useSettings: () => ({
        settings: { calorieGoal: 2200, fatsGoal: 120, carbsGoal: 250, proteinGoal: 160 },
    }),
}))

// Flattens every text node in the rendered tree into a single string.
function renderedText(root: any): string {
    return root
        .findAll((n: any) => n.type === 'Text')
        .flatMap((n: any) => n.props.children)
        .flat(Infinity)
        .filter((c: any) => typeof c === 'string' || typeof c === 'number')
        .join('')
}

describe('DailyIntakeCard', () => {
    it('shows intake / goal for calories and each macro', () => {
        let tree: any
        act(() => {
            tree = create(
                <ThemeProvider>
                    <DailyIntakeCard date={new Date(2026, 6, 17)} />
                </ThemeProvider>,
            )
        })
        const text = renderedText(tree.root)
        // Calories: intake number plus muted "/ goal".
        expect(text).toContain('1500')
        expect(text).toContain('/ 2200')
        // Macros: intake plus muted " / {goal}g".
        expect(text).toContain('84')
        expect(text).toContain(' / 120g')
        expect(text).toContain('210')
        expect(text).toContain(' / 250g')
        expect(text).toContain('130')
        expect(text).toContain(' / 160g')
    })
})
