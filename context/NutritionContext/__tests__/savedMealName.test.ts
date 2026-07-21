// context/NutritionContext/__tests__/savedMealName.test.ts
// M27: "Save" meal gave zero feedback (silent success), so a re-tap looked like a no-op and
// silently minted a "name (2)" duplicate via savedMealName's own numbering. That numbering is
// intentionally untouched (dev note on the audit line: "the duplicate name logic we have right
// now is fine") - this file pins (1) the pure numbering contract now that savedMealName is
// exported for direct testing, and (2) the awaited null/string resolution contract
// handleSaveNutrition now exposes so app/nutritionScreens/nutritionScreen.tsx's Save button can
// give real feedback ("Saved to Meals" / "Saved a Copy") instead of firing-and-forgetting.

// react-test-renderer ships no bundled types (@types/react-test-renderer not installed);
// suppress the missing-declaration error (test-only runtime dep), matching
// context/AuthContext/__tests__/setUser.test.ts.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import React from 'react'
import { Alert } from 'react-native'
import { NutritionEntry, NutritionContextInterface } from '../types'

// index.tsx imports these directly; mocked so mounting NutritionProvider exercises only its own
// handleSaveNutrition logic, without pulling in the real PowerSync DB / Supabase client / Sentry
// module-scope side effects those carry (matches context/SettingsContext/__tests__/persistEffect.test.tsx
// and context/AuthContext/__tests__/setUser.test.ts).
let mockUserID: string | undefined = 'user-1'
jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: mockUserID }),
}))

jest.mock('@/lib/hooks/useToday', () => ({
    useToday: () => '2026-07-17',
}))

jest.mock('@/lib/powersync/system', () => ({
    powerSync: { waitForFirstSync: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('../database/powersyncStore', () => ({
    loadNutritionData: jest.fn(),
    upsertNutritionEntry: jest.fn(),
    upsertSavedNutritionEntry: jest.fn(),
}))

jest.mock('@/lib/powersync/persistErrors', () => ({
    reportPersistFailure: jest.fn(),
}))

// aiFunctions.tsx is pulled in transitively (index.tsx imports analyzeAndAddPhoto). None of its
// calls are exercised here, but its own top-level imports reach expo-file-system and the real
// OpenAI/FatSecret edge-function clients (which construct a Supabase client from ENV at module
// scope) unless stubbed - mirrors context/NutritionContext/functions/__tests__/aiFunctions.test.ts.
jest.mock('@/lib/openAI/openAI', () => ({
    askOpenAIVision: jest.fn(),
    askOpenAIText: jest.fn(),
}))

jest.mock('@/lib/foodDB/foodDB', () => ({
    getFoodSearchResults: jest.fn().mockResolvedValue([]),
    getFoodItem: jest.fn(),
}))

jest.mock('expo-file-system', () => ({
    File: jest.fn().mockImplementation(() => ({
        base64: jest.fn().mockResolvedValue('fake-base64'),
    })),
}))

import { loadNutritionData, upsertSavedNutritionEntry } from '../database/powersyncStore'
import { reportPersistFailure } from '@/lib/powersync/persistErrors'
import { NutritionProvider, savedMealName, useNutrition } from '../index'

const mockLoadNutritionData = loadNutritionData as jest.Mock
const mockUpsertSavedNutritionEntry = upsertSavedNutritionEntry as jest.Mock
const mockReportPersistFailure = reportPersistFailure as jest.Mock

describe('savedMealName', () => {
    test('returns the trimmed base name when nothing else uses it', () => {
        expect(savedMealName('Chicken', [])).toBe('Chicken')
    })

    test('appends " (2)" when a saved meal already has that name', () => {
        expect(savedMealName('Chicken', [{ name: 'Chicken' }])).toBe('Chicken (2)')
    })

    test('advances past "(2)" to "(3)" when both are already taken', () => {
        expect(savedMealName('Chicken', [{ name: 'Chicken' }, { name: 'Chicken (2)' }])).toBe('Chicken (3)')
    })

    test('treats an existing name as taken regardless of case or surrounding whitespace', () => {
        expect(savedMealName('  Chicken  ', [{ name: 'chicken' }])).toBe('Chicken (2)')
    })
})

// A full NutritionEntry for a logged meal, with overrides — the shape handleSaveNutrition takes.
function makeLogEntry(overrides: Partial<NutritionEntry> = {}): NutritionEntry {
    const now = new Date('2026-07-17T12:00:00.000Z')
    return {
        id: 'log-1',
        userId: 'user-1',
        name: 'Chicken',
        date: now,
        time: now.getTime(),
        protein: 30,
        carbs: 40,
        fats: 10,
        calories: 370,
        isPhoto: false,
        items: [],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    }
}

let latest: NutritionContextInterface
let tree: any = null

// Renders nothing; stashes the live context value for assertions.
function Probe() {
    latest = useNutrition()
    return null
}

// Mounts NutritionProvider + Probe and settles the initial load effect.
async function mountProvider(): Promise<void> {
    await act(async () => {
        tree = create(React.createElement(NutritionProvider, null, React.createElement(Probe)))
    })
}

describe('handleSaveNutrition (M27: awaits the full save path before resolving)', () => {
    beforeEach(() => {
        mockUserID = 'user-1'
        mockLoadNutritionData.mockReset().mockResolvedValue({ nutritionData: [], savedNutritionEntries: [] })
        mockUpsertSavedNutritionEntry.mockReset().mockResolvedValue(undefined)
        mockReportPersistFailure.mockClear()
        jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
        if (tree) act(() => tree.unmount())
        tree = null
    })

    it('resolves null for a macro-invalid entry, without attempting the upsert (validateNutritionEntry already alerted)', async () => {
        await mountProvider()

        let result: string | null = null
        await act(async () => {
            result = await latest.handleSaveNutrition(makeLogEntry({ protein: -1 }))
        })

        expect(result).toBeNull()
        expect(mockUpsertSavedNutritionEntry).not.toHaveBeenCalled()
    })

    it('resolves the saved name once the async upsert succeeds', async () => {
        await mountProvider()

        let result: string | null = null
        await act(async () => {
            result = await latest.handleSaveNutrition(makeLogEntry({ name: 'Chicken' }))
        })

        expect(result).toBe('Chicken')
        expect(mockUpsertSavedNutritionEntry).toHaveBeenCalledTimes(1)
    })

    it('resolves null (not the optimistic name) when the async upsert throws, deferring the alert to reportPersistFailure', async () => {
        mockUpsertSavedNutritionEntry.mockRejectedValueOnce(new Error('network down'))
        await mountProvider()

        let result: string | null = null
        await act(async () => {
            result = await latest.handleSaveNutrition(makeLogEntry({ name: 'Chicken' }))
        })

        expect(result).toBeNull()
        expect(mockReportPersistFailure).toHaveBeenCalledTimes(1)
        expect(mockReportPersistFailure.mock.calls[0][0]).toBe('nutrition')
    })
})
