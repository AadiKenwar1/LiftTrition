import { ThemeProvider } from '@/context/ThemeContext'
import { Text, TextInput } from 'react-native'
import { act, create } from 'react-test-renderer'

// Router params/actions are injected per-test via these mutable fns
const mockBack = jest.fn()
let mockParams: { entry?: string } = {}

jest.mock('expo-router', () => ({
    useRouter: () => ({ back: mockBack }),
    useLocalSearchParams: () => mockParams,
}))

jest.mock('@/context/NutritionContext', () => ({
    useNutrition: () => ({ handleEditNutrition: jest.fn() }),
}))

// Build a serialized entry param the way the app passes it through the router
function entryParam(items: { name: string; brand: string | null; quantity: number; protein: number; carbs: number; fats: number; calories: number }[], name = 'Test Meal') {
    const now = new Date('2026-07-17T12:00:00Z')
    return JSON.stringify({
        id: 'entry-1',
        userId: 'user-1',
        name,
        date: now,
        time: now.getTime(),
        protein: 10,
        carbs: 20,
        fats: 5,
        calories: 165,
        isPhoto: false,
        items,
        createdAt: now,
        updatedAt: now,
    })
}

// Render the screen inside the real ThemeProvider and return the test renderer
function renderScreen(param: string) {
    mockParams = { entry: param }
    const EditEntry = require('../editEntry').default
    let tree: ReturnType<typeof create>
    act(() => {
        tree = create(
            <ThemeProvider>
                <EditEntry />
            </ThemeProvider>,
        )
    })
    return tree!
}

// All TextInputs showing the brand placeholder
function brandInputs(tree: ReturnType<typeof create>) {
    return tree.root.findAllByType(TextInput).filter((n: { props: { placeholder?: string } }) => n.props.placeholder === 'Brand (optional)')
}

const baseMacros = { quantity: 1, protein: 10, carbs: 20, fats: 5, calories: 165 }

describe('EditEntry', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('shows the brand input for an item that has a brand', () => {
        const tree = renderScreen(entryParam([{ name: 'Protein Bar', brand: 'Quest', ...baseMacros }]))
        const inputs = brandInputs(tree)
        expect(inputs).toHaveLength(1)
        expect(inputs[0].props.value).toBe('Quest')
    })

    it('hides the brand input for an item with no brand', () => {
        const tree = renderScreen(entryParam([{ name: 'Banana', brand: null, ...baseMacros }]))
        expect(brandInputs(tree)).toHaveLength(0)
    })

    it('renders the read-only name for a single-item entry', () => {
        const tree = renderScreen(entryParam([{ name: 'Banana', brand: null, ...baseMacros }], 'My Snack'))
        const nameNodes = tree.root.findAllByType(Text).filter((n: { props: { children?: unknown; numberOfLines?: number } }) => n.props.children === 'My Snack' && n.props.numberOfLines === 2)
        expect(nameNodes).toHaveLength(1)
    })
})
