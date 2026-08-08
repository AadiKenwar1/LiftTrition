import ProgressIndicator from '@/components/WorkoutComponents/ProgressIndicator'
import { ThemeProvider } from '@/context/ThemeContext'
import type { Log } from '@/context/WorkoutContext/types'
import { addDays } from '@/lib/utils/dateHelper'
import { TextInput, TouchableOpacity } from 'react-native'
import { act, create } from 'react-test-renderer'

// Router + contexts are injected per-test via these mutable, mock-prefixed refs.
const mockAddLog = jest.fn()
let mockLogs: Log[] = []

jest.mock('expo-router', () => ({
    useLocalSearchParams: () => ({ workoutId: 'w1', exerciseId: 'ex-1', exerciseName: 'Bench' }),
}))

jest.mock('@/context/WorkoutContext', () => ({
    useWorkout: () => ({
        handleAddLog: mockAddLog,
        handleDeleteLog: jest.fn(),
        logs: mockLogs,
        setLastExercise: jest.fn(),
        fullExerciseLib: { Bench: { equipment: 'Barbell' } },
    }),
}))

jest.mock('@/context/SettingsContext', () => ({
    useSettings: () => ({ settings: { unitSystem: 'imperial', bodyWeight: 180 } }),
}))

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: 'user-1' }),
}))

// The real hook schedules a midnight timer; only the key it returns matters here.
jest.mock('@/lib/hooks/useToday', () => ({
    useToday: () => require('@/lib/utils/dateHelper').getDateKey(new Date()),
}))

jest.mock('@/lib/hooks/useScreenBottomPad', () => ({ useScreenBottomPad: () => 0 }))

jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children?: React.ReactNode }) => children }))

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }))

// Stubbed: the picker is driven directly through its onConfirm prop, and the history list is
// FlatList-heavy display code that isn't under test.
jest.mock('@/components/NeutralComponents/DatePickerPopup', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/WorkoutComponents/LogHistoryList', () => ({ __esModule: true, default: () => null }))

// System time is pinned to this noon in beforeEach, so the modal's own `new Date()` and the
// mocked useToday agree on the same calendar day.
const TODAY = new Date(2026, 6, 25)

// [daysAgo, weight, reps] — same shape as the engine suite's SetSpec, built into minimal Log rows.
function buildLogs(sets: [number, number, number][]): Log[] {
    return sets.map(([daysAgo, weight, reps], i) => ({
        id: `log-${i}`,
        userID: 'user-1',
        workoutID: 'w1',
        exerciseID: 'ex-1',
        date: addDays(TODAY, -daysAgo),
        time: i,
        weight,
        reps,
        rpe: 0,
        createdAt: TODAY,
        updatedAt: TODAY,
    }))
}

// Render the real logsModal inside the real ThemeProvider against the current mockLogs.
function renderScreen() {
    const LogsModal = require('../logsModal').default
    let tree: ReturnType<typeof create>
    act(() => {
        tree = create(
            <ThemeProvider>
                <LogsModal />
            </ThemeProvider>,
        )
    })
    return tree!
}

// Confirms a day through the stubbed DatePickerPopup, exactly as the real sheet would.
function pickDate(tree: ReturnType<typeof create>, date: Date) {
    const DatePickerPopup = require('@/components/NeutralComponents/DatePickerPopup').default
    act(() => tree.root.findByType(DatePickerPopup).props.onConfirm(date))
}

// Props the modal hands the real ProgressIndicator — the exact output under test.
function indicator(tree: ReturnType<typeof create>) {
    return tree.root.findByType(ProgressIndicator).props
}

// The add CTA is the only TouchableOpacity carrying a `disabled` prop.
function addButton(tree: ReturnType<typeof create>) {
    return tree.root.findAllByType(TouchableOpacity).find((t) => 'disabled' in t.props)!
}

describe('LogsModal indicator anchoring', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date(2026, 6, 25, 12, 0, 0))
    })

    afterEach(() => {
        jest.useRealTimers()
        jest.clearAllMocks()
        mockLogs = []
    })

    it('backdating a goal-sized set never fires a goal-hit for today', () => {
        // Sessions: 5 days ago 100×10, yesterday 105×8. Today's bar is therefore 105×9, and
        // today's own 105×6 misses it. The 100×11 backfilled onto 3 days ago would exactly hit
        // THAT day's bar (100×11, off the 100×10 session) — pointing the indicator at the picker
        // date turns that into a false GOAL HIT with a 100×12 next-session goal.
        mockLogs = buildLogs([
            [5, 100, 10],
            [1, 105, 8],
            [0, 105, 6],
            [3, 100, 11],
        ])
        const tree = renderScreen()
        pickDate(tree, addDays(TODAY, -3))

        expect(indicator(tree).view).toBe('today')
        expect(indicator(tree).goal).toEqual({ weight: 105, reps: 9 })
    })

    it('a week-old backfill never re-anchors the suggestion away from the latest session', () => {
        // Yesterday's 100×10 holds today's bar (goal 100×11). Backfilling 90×11 onto 7 days ago
        // hits that old day's own bar — anchored to the picker date, the indicator would flip to
        // "next session" numbers built off the 90 lb history instead.
        mockLogs = buildLogs([
            [8, 90, 10],
            [1, 100, 10],
            [7, 90, 11],
        ])
        const tree = renderScreen()
        pickDate(tree, addDays(TODAY, -7))

        expect(indicator(tree).view).toBe('today')
        expect(indicator(tree).goal).toEqual({ weight: 100, reps: 11 })
    })

    it('empty history shows first-time calibration regardless of the picker date', () => {
        const tree = renderScreen()
        pickDate(tree, addDays(TODAY, -4))

        expect(indicator(tree)).toMatchObject({ status: 'firstTime', goal: null, view: 'today' })
    })

    it('a backdated add still saves to the picked date', () => {
        const tree = renderScreen()
        const past = addDays(TODAY, -4)
        pickDate(tree, past)

        const inputs = tree.root.findAllByType(TextInput)
        act(() => inputs[0].props.onChangeText('100'))
        act(() => inputs[1].props.onChangeText('5'))
        act(() => addButton(tree).props.onPress())

        expect(mockAddLog).toHaveBeenCalledWith('w1', 'ex-1', 'user-1', 100, 5, 0, past)
    })

    it('normal day: today view before logging, goal-hit with next-session set after', () => {
        mockLogs = buildLogs([[1, 100, 10]])
        let tree = renderScreen()
        expect(indicator(tree)).toMatchObject({ view: 'today', goal: { weight: 100, reps: 11 } })

        mockLogs = buildLogs([
            [1, 100, 10],
            [0, 100, 11],
        ])
        tree = renderScreen()
        expect(indicator(tree)).toMatchObject({ view: 'hit', goal: { weight: 100, reps: 12 } })
    })
})
