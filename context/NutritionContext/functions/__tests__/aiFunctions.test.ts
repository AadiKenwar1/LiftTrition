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

jest.mock('@/lib/foodDB/foodDB', () => ({
    getFoodSearchResults: jest.fn().mockResolvedValue([]),
    getFoodItem: jest.fn(),
}))

jest.mock('react-native-uuid', () => ({
    __esModule: true,
    default: { v4: jest.fn(() => 'test-uuid') },
}))

const mockVision = askOpenAIVision as jest.Mock

// brand: null keeps every ingredient un-branded → the FatSecret enrichment path is skipped.
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
