// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep),
// matching context/BillingContext/__tests__/billingContext.test.tsx.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { SettingsProvider, useSettings } from '../index'
import { SettingsContextInterface } from '../types'
import { DEFAULT_SETTINGS } from '../defaults'
import { persistBackoffMs } from '@/lib/powersync/persistErrors'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from '../database/powersyncStore'

// C3 regression coverage: the settings persist effect (context/SettingsContext/index.tsx)
// used to release its save mutex (persistSavingRef) only when the run was NOT cancelled.
// A mutation landing mid-save cancels the running effect instance, so the mutex was left
// stuck `true` forever and every later mutation was silently dropped. These tests pin (A)
// that the loop resumes after such an interleaving, and (B) that the fix's re-arm channel
// never pre-empts an already-scheduled exponential backoff retry.

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: 'user-1' }),
}))

jest.mock('@/lib/powersync/system', () => ({
    powerSync: { waitForFirstSync: jest.fn().mockResolvedValue(undefined) },
}))

// Sentry is only reached after SETTINGS_ALERT_AFTER consecutive failures, which neither
// test below crosses — mocked defensively so importing persistErrors never touches the
// real native SDK, matching lib/powersync/__tests__/persistErrors.test.ts.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }))

jest.mock('../database/powersyncStore', () => ({
    loadSettingsAndBw: jest.fn(),
    upsertSettings: jest.fn(),
    upsertWeightForDate: jest.fn(),
}))

const mockLoadSettingsAndBw = loadSettingsAndBw as jest.Mock
const mockUpsertSettings = upsertSettings as jest.Mock
const mockUpsertWeightForDate = upsertWeightForDate as jest.Mock

// A promise the test can resolve/reject on demand, so it can control exactly when an
// in-flight upsertSettings call settles relative to other mutations.
function createDeferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

let latest: SettingsContextInterface

// Renders nothing; stashes the live context value in `latest` for assertions.
function Probe() {
    latest = useSettings()
    return null
}

// Mounts SettingsProvider + Probe and flushes the initial load effect to completion.
async function mountProbe() {
    await act(async () => {
        create(
            <SettingsProvider>
                <Probe />
            </SettingsProvider>,
        )
    })
}

describe('SettingsContext persist effect (C3 mutex wedge)', () => {
    beforeEach(() => {
        mockLoadSettingsAndBw.mockReset().mockResolvedValue({ settings: DEFAULT_SETTINGS, bwProgress: {}, hasData: false })
        mockUpsertSettings.mockReset()
        mockUpsertWeightForDate.mockReset().mockResolvedValue(undefined)
    })

    it('resumes the save loop after a mutation lands mid-save, and a later mutation still persists', async () => {
        const deferreds: ReturnType<typeof createDeferred<void>>[] = []
        mockUpsertSettings.mockImplementation(() => {
            const d = createDeferred<void>()
            deferreds.push(d)
            return d.promise
        })

        await mountProbe()
        expect(latest.loaded).toBe(true)

        // First change starts a save that stays in flight.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 1111 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
        expect(mockUpsertSettings.mock.calls[0][1].calorieGoal).toBe(1111)

        // Second change lands while the first save is still pending — this is the
        // interleaving that cancels the running effect instance.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 2222 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1) // no second call yet

        // Resolve the first (now-cancelled) save and flush microtasks.
        await act(async () => {
            deferreds[0].resolve()
            await deferreds[0].promise
        })

        // Before the C3 fix the mutex stayed wedged `true` forever and this never fired.
        expect(mockUpsertSettings).toHaveBeenCalledTimes(2)
        expect(mockUpsertSettings.mock.calls[1][1].calorieGoal).toBe(2222)

        // Let the second save succeed cleanly (no concurrent mutation this time).
        await act(async () => {
            deferreds[1].resolve()
            await deferreds[1].promise
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(2)

        // A third, later change must still persist — proof the mutex isn't stuck.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 3333 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(3)
        expect(mockUpsertSettings.mock.calls[2][1].calorieGoal).toBe(3333)
    })

    it('does not skip the exponential backoff when a mid-save mutation left the settings reference unchanged', async () => {
        jest.useFakeTimers()
        try {
            const deferreds: ReturnType<typeof createDeferred<void>>[] = []
            mockUpsertSettings.mockImplementation(() => {
                const d = createDeferred<void>()
                deferreds.push(d)
                return d.promise
            })

            await mountProbe()
            expect(latest.loaded).toBe(true)

            await act(async () => {
                latest.setSettings((prev) => ({ ...prev, calorieGoal: 1111 }))
            })
            expect(mockUpsertSettings).toHaveBeenCalledTimes(1)

            // Mid-save mutation that returns the SAME settings reference: React bails
            // out of the state update (Object.is-equal), so `settings` never changes and
            // the in-flight effect is never cancelled — but persistDirtyDuringSaveRef is
            // still marked, via markSettingsPersistDirty.
            await act(async () => {
                latest.setSettings((prev) => prev)
            })

            // The in-flight save now fails.
            await act(async () => {
                deferreds[0].reject(new Error('db locked'))
                await deferreds[0].promise.catch(() => {})
            })

            // A naive unconditional re-arm would retry immediately here, defeating the
            // backoff. The fix must not fire the next save yet.
            expect(mockUpsertSettings).toHaveBeenCalledTimes(1)

            // Advancing right up to (but not through) the backoff window must still not retry.
            await act(async () => {
                jest.advanceTimersByTime(persistBackoffMs(0) - 1)
            })
            expect(mockUpsertSettings).toHaveBeenCalledTimes(1)

            // Crossing the backoff window fires the retry, with the latest settings.
            await act(async () => {
                jest.advanceTimersByTime(1)
            })
            expect(mockUpsertSettings).toHaveBeenCalledTimes(2)
            expect(mockUpsertSettings.mock.calls[1][1].calorieGoal).toBe(1111)
        } finally {
            jest.useRealTimers()
        }
    })
})
