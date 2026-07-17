import { ThemeProvider } from '@/context/ThemeContext'
import { getDateKey } from '@/lib/utils/dateHelper'
import { act, create } from 'react-test-renderer'
import DatePickerPopup from '../DatePickerPopup'

function findPressableByLabel(root: any, predicate: (label: string) => boolean) {
    return root.findAll((n: any) => typeof n.props?.accessibilityLabel === 'string' && predicate(n.props.accessibilityLabel) && typeof n.props?.onPress === 'function')
}

describe('DatePickerPopup', () => {
    it('confirms the tapped day as a local Date', () => {
        const onConfirm = jest.fn()
        // A fully-past month so every day is selectable regardless of the run date.
        const initial = new Date(2020, 4, 15)
        let tree: any
        act(() => {
            tree = create(
                <ThemeProvider>
                    <DatePickerPopup visible onClose={() => {}} mode="workout" selectedDate={initial} onConfirm={onConfirm} />
                </ThemeProvider>,
            )
        })
        const dayCell = findPressableByLabel(tree.root, (label) => label.startsWith('2020-05-10'))[0]
        act(() => dayCell.props.onPress())
        const confirm = findPressableByLabel(tree.root, (label) => label === 'Confirm')[0]
        act(() => confirm.props.onPress())
        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(getDateKey(onConfirm.mock.calls[0][0])).toBe('2020-05-10')
    })
})
