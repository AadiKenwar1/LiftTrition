import { askOpenAIVision } from '@/lib/openAI/openAI'
import { NutritionEntry } from '../../types'
import { analyzeAndAddPhoto } from '../aiFunctions'

jest.mock('@/lib/powersync/system', () => ({
    powerSync: { writeTransaction: jest.fn(), execute: jest.fn() },
}))

jest.mock('expo-file-system', () => ({
    File: jest.fn().mockImplementation(() => ({
        base64: jest.fn().mockResolvedValue('fake-base64'),
    })),
}))

jest.mock('@/lib/openAI/openAI', () => ({
    askOpenAIVision: jest.fn(),
    askOpenAIText: jest.fn(),
}))

jest.mock('react-native-uuid', () => ({
    __esModule: true,
    default: { v4: jest.fn(() => 'test-uuid') },
}))

const mockVision = askOpenAIVision as jest.Mock

const VISION_JSON = JSON.stringify({
    name: 'Test Meal',
    ingredients: [{ name: 'Rice', brand: null, quantity: 1, protein: 5, carbs: 40, fats: 1, calories: 200 }],
})

function makeSetter() {
    let state: NutritionEntry[] = []
    const setter = jest.fn((updater: any) => {
        state = typeof updater === 'function' ? updater(state) : updater
    })
    return { setter, entries: () => state }
}

beforeEach(() => {
    jest.clearAllMocks()
    // withTimeout leaves dangling 30s/15s real timers per analysis; fake timers keep Jest's exit clean.
    jest.useFakeTimers()
})

afterEach(() => {
    jest.useRealTimers()
})

describe('analyzeAndAddPhoto shouldCommit gate', () => {
    it('discards the result when shouldCommit is false at resolution (swipe mid-flight)', async () => {
        let resolveVision!: (v: string) => void
        mockVision.mockReturnValue(new Promise<string>((res) => { resolveVision = res }))
        const { setter } = makeSetter()
        let canceled = false

        const pending = analyzeAndAddPhoto('file://p.jpg', 'user-1', setter, new Date('2026-07-15'), 'meal', () => !canceled)
        canceled = true
        resolveVision(VISION_JSON)

        await expect(pending).resolves.toBeNull()
        expect(setter).not.toHaveBeenCalled()
    })

    it('commits and returns the entry when shouldCommit is true', async () => {
        mockVision.mockResolvedValue(VISION_JSON)
        const { setter, entries } = makeSetter()

        const entry = await analyzeAndAddPhoto('file://p.jpg', 'user-1', setter, new Date('2026-07-15'), 'meal', () => true)

        expect(entry).not.toBeNull()
        expect(entry!.isPhoto).toBe(true)
        expect(entry!.date.getTime()).toBe(new Date('2026-07-15').getTime())
        expect(setter).toHaveBeenCalledTimes(1)
        expect(entries()[0].name).toBe('Test Meal')
    })

    it('commits when shouldCommit is omitted (existing callers unchanged)', async () => {
        mockVision.mockResolvedValue(VISION_JSON)
        const { setter } = makeSetter()

        const entry = await analyzeAndAddPhoto('file://p.jpg', 'user-1', setter, new Date('2026-07-15'))

        expect(entry).not.toBeNull()
        expect(setter).toHaveBeenCalledTimes(1)
    })

    it('still throws on analysis failure and never commits', async () => {
        mockVision.mockRejectedValue(new Error('boom'))
        const { setter } = makeSetter()

        await expect(
            analyzeAndAddPhoto('file://p.jpg', 'user-1', setter, new Date(), 'meal', () => true),
        ).rejects.toThrow('boom')
        expect(setter).not.toHaveBeenCalled()
    })
})

// Entry naming: a photo that finds exactly one branded item reads as a packaged-product scan
// and takes the product's name; anything else keeps the model's top-level dish name.
describe('analyzeAndAddPhoto entry naming', () => {
    const BAR = { name: 'Protein bar', brand: 'Quest Bar', quantity: 1, protein: 20, carbs: 22, fats: 9, calories: 190 }
    const RICE = { name: 'Rice', brand: null, quantity: 1, protein: 5, carbs: 40, fats: 1, calories: 200 }

    // Runs one analysis against the given vision reply and returns the committed entry's name.
    async function nameFor(reply: object): Promise<string> {
        mockVision.mockResolvedValue(JSON.stringify(reply))
        const { setter, entries } = makeSetter()
        await analyzeAndAddPhoto('file://p.jpg', 'user-1', setter, new Date('2026-07-15'), 'meal', () => true)
        return entries()[0].name
    }

    it('names the entry after the brand when the photo finds exactly one branded item', async () => {
        expect(await nameFor({ name: 'Protein bar', ingredients: [BAR] })).toBe('Quest Bar')
    })

    it('keeps the dish name when a branded item sits among other foods', async () => {
        expect(await nameFor({ name: 'Rice bowl with protein bar', ingredients: [BAR, RICE] })).toBe('Rice bowl with protein bar')
    })

    it('keeps the dish name for a single unbranded item', async () => {
        expect(await nameFor({ name: 'Fried rice', ingredients: [RICE] })).toBe('Fried rice')
    })

    it('treats a whitespace-only brand as unbranded', async () => {
        expect(await nameFor({ name: 'Mystery snack', ingredients: [{ ...BAR, brand: '   ' }] })).toBe('Mystery snack')
    })
})

// M8: analyzeAndAddPhoto must thread an AbortSignal all the way down to askOpenAIVision so
// cancelling the analyze modal actually aborts the in-flight edge-function request, not just
// discards the result once it resolves (the previously-adjudicated hard-gate defect).
describe('analyzeAndAddPhoto signal propagation (M8)', () => {
    it('forwards the given AbortSignal through to askOpenAIVision', async () => {
        mockVision.mockResolvedValue(VISION_JSON)
        const { setter } = makeSetter()
        const controller = new AbortController()

        await analyzeAndAddPhoto('file://p.jpg', 'user-1', setter, new Date('2026-07-15'), 'meal', () => true, controller.signal)

        expect(mockVision).toHaveBeenCalledWith('data:image/jpeg;base64,fake-base64', 'meal', controller.signal)
    })

    it('calls askOpenAIVision with an undefined signal when none is passed (existing callers unchanged)', async () => {
        mockVision.mockResolvedValue(VISION_JSON)
        const { setter } = makeSetter()

        await analyzeAndAddPhoto('file://p.jpg', 'user-1', setter, new Date('2026-07-15'))

        expect(mockVision).toHaveBeenCalledWith('data:image/jpeg;base64,fake-base64', 'meal', undefined)
    })
})
