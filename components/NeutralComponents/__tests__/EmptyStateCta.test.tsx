import { ThemeProvider } from '@/context/ThemeContext'
import { Dumbbell } from 'lucide-react-native'
import { Text } from 'react-native'
import { act, create } from 'react-test-renderer'
import EmptyStateCta from '../EmptyStateCta'

/**
 * Every button the user can reach. Matches on the accessibility role rather than a bare `onPress`,
 * which would also match EmptyStateCta itself (it takes an onPress prop). `deep: false` stops at the
 * outermost match, so one button counts once instead of once per layer it renders through
 * (PressableScale → Pressable → View).
 */
function findButtons(root: any) {
    return root.findAll((n: any) => n.props?.accessibilityRole === 'button' && typeof n.props?.onPress === 'function', { deep: false })
}

// All rendered strings, flattened — the component nests text inside styled <Text> wrappers.
function renderedText(root: any): string[] {
    return root.findAllByType(Text).flatMap((n: any) => (Array.isArray(n.props.children) ? n.props.children : [n.props.children])).filter((c: any) => typeof c === 'string')
}

describe('EmptyStateCta', () => {
    // The whole point of the component: the empty state IS the add action
    it('renders a labelled button that fires onPress when a ctaLabel is given', () => {
        const onPress = jest.fn()
        let tree: any
        act(() => {
            tree = create(
                <ThemeProvider>
                    <EmptyStateCta Icon={Dumbbell} accent="#2C63AD" title="No Workouts Yet" ctaLabel="Add your first workout" onPress={onPress} />
                </ThemeProvider>,
            )
        })

        const buttons = findButtons(tree.root)
        expect(buttons).toHaveLength(1)
        expect(buttons[0].props.accessibilityLabel).toBe('Add your first workout')

        act(() => buttons[0].props.onPress())
        expect(onPress).toHaveBeenCalledTimes(1)

        expect(renderedText(tree.root)).toEqual(expect.arrayContaining(['No Workouts Yet', 'Add your first workout']))
        act(() => tree.unmount())
    })

    // A past nutrition date has nothing to add, so the block must state that and offer no target.
    // onPress is passed anyway: the label is what decides, so a stray handler must not make the hero
    // tappable — that would open the add flow for a day the CTA never invited.
    it('renders the subtitle and nothing tappable when no ctaLabel is given', () => {
        const onPress = jest.fn()
        let tree: any
        act(() => {
            tree = create(
                <ThemeProvider>
                    <EmptyStateCta Icon={Dumbbell} accent="#0D7331" title="No Nutrition Logs Recorded" subtitle="No nutrition entries recorded for Mar 14" onPress={onPress} />
                </ThemeProvider>,
            )
        })

        expect(findButtons(tree.root)).toHaveLength(0)
        expect(renderedText(tree.root)).toEqual(expect.arrayContaining(['No Nutrition Logs Recorded', 'No nutrition entries recorded for Mar 14']))
        act(() => tree.unmount())
    })
})
