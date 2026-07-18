jest.mock('expo-notifications', () => ({
    cancelAllScheduledNotificationsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}))
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }))

import type { NutritionStreakState } from '@/context/NutritionContext/types'
import * as Sentry from '@sentry/react-native'
import * as Notifications from 'expo-notifications'
import { runNotificationReschedule, scheduleBatch } from '../scheduler'

const mockCancel = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock
const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock
const mockCapture = Sentry.captureException as jest.Mock

const bigStreak: NutritionStreakState = { loggedToday: true, streakIncludingToday: 10, streakThroughYesterday: 9 }

beforeEach(() => {
    jest.clearAllMocks()
    mockCancel.mockResolvedValue(undefined)
    mockSchedule.mockResolvedValue('id')
    mockGetPermissions.mockResolvedValue({ status: 'granted' })
})

describe('scheduleBatch', () => {
    it('cancels everything before scheduling the new batch', async () => {
        const date = new Date(2026, 6, 18, 9, 0)
        await scheduleBatch([{ content: { title: 'T', body: 'B' }, date }])
        expect(mockCancel).toHaveBeenCalledTimes(1)
        expect(mockSchedule).toHaveBeenCalledWith({
            content: { title: 'T', body: 'B' },
            trigger: { type: 'date', date },
        })
        expect(mockCancel.mock.invocationCallOrder[0]).toBeLessThan(mockSchedule.mock.invocationCallOrder[0])
    })

    it('still cancels when the batch is empty', async () => {
        await scheduleBatch([])
        expect(mockCancel).toHaveBeenCalledTimes(1)
        expect(mockSchedule).not.toHaveBeenCalled()
    })
})

describe('runNotificationReschedule', () => {
    it('schedules nothing when prefs are default (master off) but still clears pending', async () => {
        await runNotificationReschedule([], bigStreak, new Date(2026, 6, 17, 7, 0))
        expect(mockCancel).toHaveBeenCalledTimes(1)
        expect(mockSchedule).not.toHaveBeenCalled()
    })

    it('captures errors instead of throwing', async () => {
        mockCancel.mockRejectedValueOnce(new Error('boom'))
        await expect(runNotificationReschedule([], bigStreak)).resolves.toBeUndefined()
        expect(mockCapture).toHaveBeenCalledTimes(1)
    })
})
