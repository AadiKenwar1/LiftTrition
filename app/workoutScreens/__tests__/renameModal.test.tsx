import { ThemeProvider } from '@/context/ThemeContext'
import type { Workout } from '@/context/WorkoutContext/types'
import { Alert, TextInput, TouchableOpacity } from 'react-native'
import { act, create } from 'react-test-renderer'

// Router + workout context are injected per-test via these mutable, mock-prefixed refs.
const mockBack = jest.fn()
const mockRename = jest.fn()
let mockParams: { workoutId?: string } = {}
let mockWorkouts: Workout[] = []

jest.mock('expo-router', () => ({
    useRouter: () => ({ back: mockBack }),
    useLocalSearchParams: () => mockParams,
}))

jest.mock('@/context/WorkoutContext', () => ({
    useWorkout: () => ({ workouts: mockWorkouts, handleRenameWorkout: mockRename }),
}))

// Minimal Workout row — only id/name/archived are read by the modal + name check.
function wk(id: string, name: string, archived = false): Workout {
    return { id, userID: 'u', name, order: 0, archived, note: '', createdAt: new Date(), updatedAt: new Date() }
}

// Render the real renameModal inside the real ThemeProvider for a given workoutId.
function renderScreen(workoutId: string) {
    mockParams = { workoutId }
    const RenameModal = require('../renameModal').default
    let tree: ReturnType<typeof create>
    act(() => {
        tree = create(
            <ThemeProvider>
                <RenameModal />
            </ThemeProvider>,
        )
    })
    return tree!
}

// The single Rename CTA is the only TouchableOpacity in the modal.
function renameButton(tree: ReturnType<typeof create>) {
    return tree.root.findAllByType(TouchableOpacity)[0]
}

// The workout-name field is the only TextInput in the modal.
function nameInput(tree: ReturnType<typeof create>) {
    return tree.root.findAllByType(TextInput)[0]
}

describe('RenameModal guards', () => {
    afterEach(() => {
        jest.clearAllMocks()
        mockWorkouts = []
        mockParams = {}
    })

    it('renames + backs out exactly once on a rapid double-tap', async () => {
        mockWorkouts = [wk('w1', 'Push'), wk('w2', 'Legs')]
        const tree = renderScreen('w1')
        act(() => nameInput(tree).props.onChangeText('Upper'))

        await act(async () => {
            const btn = renameButton(tree)
            btn.props.onPress()
            btn.props.onPress()
        })

        expect(mockRename).toHaveBeenCalledTimes(1)
        expect(mockRename).toHaveBeenCalledWith('w1', 'Upper')
        expect(mockBack).toHaveBeenCalledTimes(1)
    })

    it('rejects a taken name via Alert, commits nothing, and leaves the guard un-consumed', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        mockWorkouts = [wk('w1', 'Push'), wk('w2', 'Legs')]
        const tree = renderScreen('w1')

        // Try to take another active workout's name → rejected before the guard.
        act(() => nameInput(tree).props.onChangeText('legs'))
        await act(async () => {
            renameButton(tree).props.onPress()
        })
        expect(alertSpy).toHaveBeenCalledTimes(1)
        expect(mockRename).not.toHaveBeenCalled()
        expect(mockBack).not.toHaveBeenCalled()

        // The single-flight lock was never consumed: a valid rename still goes through.
        act(() => nameInput(tree).props.onChangeText('Pull'))
        await act(async () => {
            renameButton(tree).props.onPress()
        })
        expect(mockRename).toHaveBeenCalledTimes(1)
        expect(mockRename).toHaveBeenCalledWith('w1', 'Pull')
        expect(mockBack).toHaveBeenCalledTimes(1)

        alertSpy.mockRestore()
    })

    it('lets a workout keep its own name (self excluded from the taken check)', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        mockWorkouts = [wk('w1', 'Push'), wk('w2', 'Legs')]
        const tree = renderScreen('w1')

        // Seeded name is its own ('Push') — renaming to the same must NOT read as taken.
        await act(async () => {
            renameButton(tree).props.onPress()
        })
        expect(alertSpy).not.toHaveBeenCalled()
        expect(mockRename).toHaveBeenCalledWith('w1', 'Push')
        expect(mockBack).toHaveBeenCalledTimes(1)

        alertSpy.mockRestore()
    })
})
