process.env.TZ = 'America/New_York'

jest.mock('@/lib/powersync/system', () => ({ powerSync: { getAll: jest.fn(), writeTransaction: jest.fn(), execute: jest.fn() } }))

import { settingsToRow, rowToSettings } from '../powersyncStore'
import { Settings } from '../../types'
import type { SettingsRecord } from '@/lib/powersync/AppSchema'

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: new Date(1990, 5, 22),
        gender: 'male',
        height: 175,
        bodyWeight: 170,
        activityLevel: 'moderate',
        unitSystem: 'imperial',
        goalType: 'maintain',
        goalWeight: 190,
        goalPace: 0,
        calorieGoal: 2000,
        proteinGoal: 130,
        carbsGoal: 200,
        fatsGoal: 54,
        ...overrides,
    }
}

it('sanity: timezone is actually pinned to a negative offset', () => {
    expect(new Date(2026, 6, 13, 21, 0).toISOString().startsWith('2026-07-14')).toBe(true)
})

describe('settings date serialization under America/New_York', () => {
    it('settingsToRow stores the local calendar day for a late-evening onboarding timestamp', () => {
        const settings = makeSettings({ onboardingCompletedAt: new Date(2026, 6, 13, 21, 0) })
        const row = settingsToRow(settings, 'user-1')
        expect(row.onboarding_completed_at).toBe('2026-07-13')
    })

    it('birthDate round-trips to the same local day', () => {
        const settings = makeSettings({ birthDate: new Date(1990, 5, 22) })
        const row = settingsToRow(settings, 'user-1')
        const roundTripped = rowToSettings(row as unknown as SettingsRecord)
        expect(roundTripped.birthDate.getDate()).toBe(22)
    })

    it('rowToSettings parses a stored birth_date string to the correct local day', () => {
        const row = { birth_date: '1990-06-22', onboarding_completed_at: null } as unknown as SettingsRecord
        const settings = rowToSettings(row)
        expect(settings.birthDate.getDate()).toBe(22)
    })
})
