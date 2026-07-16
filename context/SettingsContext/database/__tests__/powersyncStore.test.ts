jest.mock('@/lib/powersync/system', () => ({ powerSync: { getAll: jest.fn(), writeTransaction: jest.fn(), execute: jest.fn() } }))

import { settingsToRow, rowToSettings } from '../powersyncStore'
import { Settings } from '../../types'
import type { SettingsRecord } from '@/lib/powersync/AppSchema'
import { getDateKey } from '@/lib/utils/dateHelper'
import { DEFAULT_SETTINGS } from '../../defaults'

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: new Date(2026, 6, 13),
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
        macrosCustomized: false,
        goalOvershootAcknowledged: false,
        ...overrides,
    }
}

function makeRow(overrides: Partial<SettingsRecord> = {}): SettingsRecord {
    return {
        id: 'settings-1',
        user_id: 'user-1',
        birth_date: '1990-06-22',
        gender: 'male',
        height: 175,
        body_weight: 170,
        unit_system: 'imperial',
        activity_level: 'moderate',
        goal_type: 'maintain',
        goal_weight: 190,
        goal_pace: 0.5,
        calorie_goal: 2000,
        protein_goal: 130,
        carbs_goal: 200,
        fats_goal: 54,
        onboarding_complete: 1,
        onboarding_completed_at: '2026-07-13',
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-01 00:00:00',
        ...overrides,
    } as SettingsRecord
}

describe('settingsToRow / rowToSettings round-trip', () => {
    it('preserves local calendar components for birthDate and onboardingCompletedAt through a round trip', () => {
        const settings = makeSettings({ birthDate: new Date(1990, 5, 22), onboardingCompletedAt: new Date(2026, 6, 13) })
        const row = settingsToRow(settings, 'user-1')
        const roundTripped = rowToSettings(row as unknown as SettingsRecord)

        expect(roundTripped.birthDate.getFullYear()).toBe(1990)
        expect(roundTripped.birthDate.getMonth()).toBe(5)
        expect(roundTripped.birthDate.getDate()).toBe(22)

        expect(roundTripped.onboardingCompletedAt?.getFullYear()).toBe(2026)
        expect(roundTripped.onboardingCompletedAt?.getMonth()).toBe(6)
        expect(roundTripped.onboardingCompletedAt?.getDate()).toBe(13)
    })

    it('settingsToRow maps undefined onboardingCompletedAt to null', () => {
        const settings = makeSettings({ onboardingCompletedAt: undefined })
        const row = settingsToRow(settings, 'user-1')
        expect(row.onboarding_completed_at).toBeNull()
    })

    it('rowToSettings parses a stored birth_date string to the correct local calendar day', () => {
        const row = makeRow({ birth_date: '1990-06-22' })
        const settings = rowToSettings(row)
        expect(settings.birthDate.getFullYear()).toBe(1990)
        expect(settings.birthDate.getMonth()).toBe(5)
        expect(settings.birthDate.getDate()).toBe(22)
    })

    it('settingsToRow pins onboarding_completed_at to the canonical local date key in any zone', () => {
        const d = new Date(2026, 6, 13, 21, 0)
        const settings = makeSettings({ onboardingCompletedAt: d })
        const row = settingsToRow(settings, 'user-1')
        expect(row.onboarding_completed_at).toBe(getDateKey(d))
    })

    it('settingsToRow pins birth_date to the canonical local date key in any zone', () => {
        const d = new Date(1990, 5, 22, 21, 0)
        const settings = makeSettings({ birthDate: d })
        const row = settingsToRow(settings, 'user-1')
        expect(row.birth_date).toBe(getDateKey(d))
    })

    it('round-trips the intent flags', () => {
        const row = settingsToRow(makeSettings({ macrosCustomized: true, goalOvershootAcknowledged: true }), 'user-1')
        expect(row.macros_customized).toBe(1)
        expect(row.goal_overshoot_acknowledged).toBe(1)
        const back = rowToSettings(row as unknown as SettingsRecord)
        expect(back.macrosCustomized).toBe(true)
        expect(back.goalOvershootAcknowledged).toBe(true)
    })

    it('defaults missing intent flags to false (legacy rows not yet backfilled)', () => {
        const legacyRow = makeRow()
        delete (legacyRow as Record<string, unknown>).macros_customized
        delete (legacyRow as Record<string, unknown>).goal_overshoot_acknowledged
        const back = rowToSettings(legacyRow)
        expect(back.macrosCustomized).toBe(false)
        expect(back.goalOvershootAcknowledged).toBe(false)
    })

    it('hydrates NULL goal_pace to the shared default', () => {
        const row = settingsToRow(makeSettings(), 'user-1') as Record<string, unknown>
        row.goal_pace = null
        const back = rowToSettings(row as unknown as SettingsRecord)
        expect(back.goalPace).toBe(DEFAULT_SETTINGS.goalPace)
        expect(DEFAULT_SETTINGS.goalPace).toBe(0.5)
    })
})
