// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { Text } from 'react-native'
import { ThemeProvider } from '@/context/ThemeContext'
import { estimate1RM } from '@/context/WorkoutContext/functions/oneRepMaxFunctions'
import HowGraphsWorkScreen from '../howGraphsWork'

/**
 * Drift guard: the Strength chapter restates oneRepMaxFunctions.tsx's Epley coefficient as display
 * text (the other chapters' values are diagram shapes only, not real constants — see the screen's own
 * header comment). The expected coefficient is solved from the real exported estimate1RM at two known
 * inputs, never a second hardcoded "0.0333" literal, so a future retune of the formula that this screen
 * doesn't follow fails this test instead of only going stale silently.
 */

type Root = ReturnType<typeof create>

// Flattens every Text on screen (including FormulaPanel's per-token nested Text) so the case can assert on rendered copy.
function allText(root: Root): string {
    return root.root
        .findAllByType(Text)
        .map((t) => (Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children)))
        .join(' ')
}

describe('HowGraphsWorkScreen — restated Epley coefficient tracks the real one', () => {
    test('Epley formula panel states the coefficient estimate1RM actually applies', () => {
        let root: Root
        act(() => {
            root = create(
                <ThemeProvider>
                    <HowGraphsWorkScreen />
                </ThemeProvider>,
            )
        })
        // estimate1RM(weight, reps) = weight * (1 + c * reps) for reps > 1 (reps === 1 is a special
        // case that returns weight unmodified) — solved for c instead of importing a private constant.
        const coefficient = (estimate1RM(100, 2) - 100) / (100 * 2)
        const text = allText(root!)
        expect(text).toContain(coefficient.toFixed(4))
    })
})
