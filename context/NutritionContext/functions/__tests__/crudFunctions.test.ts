import { SetStateAction } from 'react'
import { NutritionEntry } from '../../types'
import { getFilteredSavedNutritionEntries, saveNutrition, sortSavedNutritionEntries } from '../crudFunctions'

jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        writeTransaction: jest.fn(async (fn: (tx: { execute: jest.Mock }) => Promise<void>) => {
            const tx = { execute: jest.fn().mockResolvedValue(undefined) }
            await fn(tx)
            return tx
        }),
    },
}))

function createMockSavedEntry(id: string, createdAt: Date): NutritionEntry {
    return {
        id,
        userId: 'user-1',
        name: `Meal ${id}`,
        date: new Date('2024-01-15'),
        time: 1234567890,
        protein: 20,
        carbs: 30,
        fats: 10,
        calories: 300,
        isPhoto: false,
        items: [],
        createdAt,
        updatedAt: createdAt,
    }
}

describe('sortSavedNutritionEntries', () => {
    test('sorts by createdAt descending', () => {
        const entries = [
            createMockSavedEntry('a', new Date(1)),
            createMockSavedEntry('b', new Date(3)),
            createMockSavedEntry('c', new Date(2)),
        ]
        expect(sortSavedNutritionEntries(entries).map((e) => e.id)).toEqual(['b', 'c', 'a'])
    })

    test('does not mutate the input array', () => {
        const entries = [createMockSavedEntry('a', new Date(1)), createMockSavedEntry('b', new Date(2))]
        const copy = [...entries]
        sortSavedNutritionEntries(entries)
        expect(entries).toEqual(copy)
    })
})

describe('getFilteredSavedNutritionEntries', () => {
    test('returns newest-saved-first entries when search is empty', () => {
        const entries = [
            createMockSavedEntry('old', new Date(1)),
            createMockSavedEntry('new', new Date(10)),
        ]
        expect(getFilteredSavedNutritionEntries(entries, '  ').map((e) => e.id)).toEqual(['new', 'old'])
    })

    test('filters by name case-insensitively after sorting', () => {
        const entries = [
            createMockSavedEntry('a', new Date(1)),
            createMockSavedEntry('b', new Date(2)),
            { ...createMockSavedEntry('c', new Date(3)), name: 'Chicken Bowl' },
        ]
        expect(getFilteredSavedNutritionEntries(entries, 'chicken').map((e) => e.name)).toEqual(['Chicken Bowl'])
    })
})

describe('saveNutrition', () => {
    test('prepends new saved meal to the top of the list', () => {
        const existing = createMockSavedEntry('a', new Date(1))
        const incoming = createMockSavedEntry('b', new Date(2))
        let state = [existing]
        const setter = jest.fn((updater: SetStateAction<NutritionEntry[]>) => {
            state = typeof updater === 'function' ? updater(state) : updater
        })

        expect(saveNutrition(incoming, setter)).toBe(true)
        expect(state.map((e) => e.id)).toEqual(['b', 'a'])
    })
})
