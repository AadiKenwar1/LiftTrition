import Entry from '@/components/NutritionComponents/Entry'
import { ThemeProvider } from '@/context/ThemeContext'
import { Alert } from 'react-native'
import { act, create } from 'react-test-renderer'

// NutritionScreen calls useRouter() at render; the delete flow never uses it.
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
}))

// The guard under test: Delete must route through confirmDelete, not delete directly.
jest.mock('@/lib/utils/confirmDelete', () => ({
    confirmDelete: jest.fn(),
}))

// Pin "today" so the screen doesn't spin up date timers during the test.
jest.mock('@/lib/hooks/useToday', () => ({
    useToday: () => '2026-07-17',
}))

// Children unrelated to the delete flow — stub so the screen renders in isolation.
jest.mock('@/components/NutritionComponents/DailyIntakeCard', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/NeutralComponents/DatePickerPopup', () => ({ __esModule: true, default: () => null }))

const mockHandleDeleteNutrition = jest.fn()
const mockEntryDate = new Date('2026-07-17T12:00:00Z')
const mockEntry = {
    id: 'entry-1',
    userId: 'user-1',
    name: 'Grilled Chicken & Rice',
    date: mockEntryDate,
    time: mockEntryDate.getTime(),
    protein: 52,
    carbs: 68,
    fats: 14,
    calories: 620,
    isPhoto: false,
    items: [],
    createdAt: mockEntryDate,
    updatedAt: mockEntryDate,
}

jest.mock('@/context/NutritionContext', () => ({
    useNutrition: () => ({
        nutritionData: [mockEntry],
        selectedDate: mockEntryDate,
        setSelectedDate: jest.fn(),
        handleSaveNutrition: jest.fn(),
        handleDeleteNutrition: mockHandleDeleteNutrition,
    }),
}))

// Render NutritionScreen inside the real ThemeProvider.
function renderScreen() {
    const NutritionScreen = require('../nutritionScreen').default
    let tree: ReturnType<typeof create>
    act(() => {
        tree = create(
            <ThemeProvider>
                <NutritionScreen />
            </ThemeProvider>,
        )
    })
    return tree!
}

describe('NutritionScreen delete confirmation (Issue C4)', () => {
    afterEach(() => jest.clearAllMocks())

    it('routes the Delete menu option through confirmDelete instead of deleting on the first tap', () => {
        const { confirmDelete } = require('@/lib/utils/confirmDelete')
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const tree = renderScreen()

        // Open the row's Options menu via the pencil affordance.
        const rows = tree.root.findAllByType(Entry)
        expect(rows.length).toBeGreaterThan(0)
        act(() => rows[0].props.onEditPress())

        // The Options Alert was shown — grab its destructive Delete button.
        const buttons = alertSpy.mock.calls[0][2] ?? []
        const del = buttons.find((b) => b.text === 'Delete')
        expect(del).toBeDefined()
        expect(del!.style).toBe('destructive')

        // Pressing Delete opens the confirm and does NOT delete directly.
        act(() => del!.onPress!())
        expect(mockHandleDeleteNutrition).not.toHaveBeenCalled()
        expect(confirmDelete).toHaveBeenCalledTimes(1)

        // The confirm names the entry and only deletes on explicit confirm.
        const opts = confirmDelete.mock.calls[0][0]
        expect(opts.title).toContain(mockEntry.name)
        expect(typeof opts.onConfirm).toBe('function')
        opts.onConfirm()
        expect(mockHandleDeleteNutrition).toHaveBeenCalledWith(mockEntry.id)

        alertSpy.mockRestore()
    })
})
