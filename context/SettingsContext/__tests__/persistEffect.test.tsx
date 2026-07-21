// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep),
// matching context/BillingContext/__tests__/billingContext.test.tsx.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { SettingsProvider, useSettings } from '../index'
import { Settings, SettingsContextInterface } from '../types'
import { DEFAULT_SETTINGS } from '../defaults'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from '../database/powersyncStore'
import { persistBackoffMs, reportPersistFailure } from '@/lib/powersync/persistErrors'

// M15 state-machine coverage for the SettingsContext persist effect
// (context/SettingsContext/index.tsx). The C3 mutex-wedge / mid-save re-queue interleaving
// is already pinned by index.persist.test.tsx; this file adds the three behaviors no test
// crosses today: the consecutive-failure ALERT threshold (SETTINGS_ALERT_AFTER), the
// onboarding "keep retrying past the alert" branch, and the rollback-vs-new-edit race in
// reloadFromDisk (a stale disk read overwriting a newer edit — the rollback-path analog of
// the isStale guard useAsyncLoad already has). It also re-pins the re-queue for a
// self-contained view of the effect.

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: 'user-1' }),
}))

jest.mock('@/lib/powersync/system', () => ({
    powerSync: { waitForFirstSync: jest.fn().mockResolvedValue(undefined) },
}))

// persistErrors imports @sentry/react-native at module top; mock it so requireActual (used to
// keep the REAL persistBackoffMs schedule, which advanceTimersByTime lines up against) never
// touches the native SDK. Matches lib/powersync/__tests__/persistErrors.test.ts.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }))

// Mock reportPersistFailure so its call args (severity / onboarding) are directly assertable,
// while keeping the REAL persistBackoffMs. The stand-in mirrors production's one behavior this
// effect depends on: outside onboarding it drives the disk rollback via reload().
jest.mock('@/lib/powersync/persistErrors', () => {
    const actual = jest.requireActual('@/lib/powersync/persistErrors') as typeof import('@/lib/powersync/persistErrors')
    return {
        __esModule: true,
        persistBackoffMs: actual.persistBackoffMs,
        reportPersistFailure: jest.fn((_scope: unknown, _error: unknown, opts?: { reload?: () => void; onboarding?: boolean }) => {
            if (!opts?.onboarding) opts?.reload?.()
        }),
    }
})

jest.mock('../database/powersyncStore', () => ({
    loadSettingsAndBw: jest.fn(),
    upsertSettings: jest.fn(),
    upsertWeightForDate: jest.fn(),
}))

const mockLoadSettingsAndBw = loadSettingsAndBw as jest.Mock
const mockUpsertSettings = upsertSettings as jest.Mock
const mockUpsertWeightForDate = upsertWeightForDate as jest.Mock
const mockReport = reportPersistFailure as jest.Mock

// A promise the test resolves/rejects on demand, to control exactly when an in-flight async
// call settles relative to other mutations (mirrors index.persist.test.tsx).
function createDeferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

type LoadResult = { settings: Settings; bwProgress: Record<string, number>; hasData: boolean }

// Full Settings object with overrides; onboarded by default (normal, roll-back-on-failure use).
function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return { ...DEFAULT_SETTINGS, onboardingComplete: true, ...overrides }
}

let latest: SettingsContextInterface

// Renders nothing; stashes the live context value for assertions.
function Probe() {
    latest = useSettings()
    return null
}

// Mounts SettingsProvider + Probe and settles the initial load effect.
async function mountProbe() {
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(
            <SettingsProvider>
                <Probe />
            </SettingsProvider>,
        )
    })
    return root
}

describe('SettingsContext persist effect — failure escalation & rollback race (M15)', () => {
    beforeEach(() => {
        mockLoadSettingsAndBw.mockReset().mockResolvedValue({ settings: makeSettings(), bwProgress: {}, hasData: true } as LoadResult)
        mockUpsertSettings.mockReset()
        mockUpsertWeightForDate.mockReset().mockResolvedValue(undefined)
        // mockClear (not mockReset) keeps the faithful reload-driving implementation.
        mockReport.mockClear()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('re-queues an edit that lands mid-save and persists the second edit (persistDirty settles)', async () => {
        const first = createDeferred<void>()
        mockUpsertSettings.mockImplementationOnce(() => first.promise).mockResolvedValue(undefined)

        const root = await mountProbe()
        expect(latest.loaded).toBe(true)

        // Edit A starts a save that stays in flight.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 111 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
        expect(mockUpsertSettings.mock.calls[0][1].calorieGoal).toBe(111)

        // Edit B lands while the first save is in flight → re-queued via persistDirtyDuringSaveRef.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 222 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)

        // Resolving the first save drains the re-queued edit as a second save carrying B's payload.
        await act(async () => {
            first.resolve()
            await first.promise
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(2)
        expect(mockUpsertSettings.mock.calls[1][1].calorieGoal).toBe(222)
        // persistDirty settled false → the loop is quiescent (no spurious third save).
        expect(mockUpsertSettings).toHaveBeenCalledTimes(2)
        expect(latest.settings.calorieGoal).toBe(222)

        await act(async () => {
            root.unmount()
        })
    })

    it('reports exactly once, severity "high", only after the 3rd consecutive failure (normal use)', async () => {
        jest.useFakeTimers()
        mockUpsertSettings.mockRejectedValue(new Error('db locked'))

        const root = await mountProbe()
        expect(latest.loaded).toBe(true)

        // Edit → save #1 fails; below the threshold, so no alert yet.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 111 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
        expect(mockReport).not.toHaveBeenCalled()

        // Cross backoff #1 → save #2 fails; still below threshold.
        await act(async () => {
            jest.advanceTimersByTime(persistBackoffMs(0))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(2)
        expect(mockReport).not.toHaveBeenCalled()

        // Cross backoff #2 → save #3 fails → the 3rd consecutive miss surfaces the alert, once.
        await act(async () => {
            jest.advanceTimersByTime(persistBackoffMs(1))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(3)
        expect(mockReport).toHaveBeenCalledTimes(1)
        expect(mockReport).toHaveBeenCalledWith('settings', expect.any(Error), expect.objectContaining({ severity: 'high', onboarding: false }))

        await act(async () => {
            root.unmount()
        })
    })

    it('keeps retrying past the alert during onboarding (falls through instead of returning)', async () => {
        jest.useFakeTimers()
        mockLoadSettingsAndBw.mockResolvedValue({ settings: makeSettings({ onboardingComplete: false }), bwProgress: {}, hasData: true } as LoadResult)
        mockUpsertSettings.mockRejectedValue(new Error('db locked'))

        const root = await mountProbe()
        expect(latest.loaded).toBe(true)

        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 111 }))
        })
        await act(async () => {
            jest.advanceTimersByTime(persistBackoffMs(0))
        })
        await act(async () => {
            jest.advanceTimersByTime(persistBackoffMs(1))
        })
        // 3rd failure: alert fires with onboarding:true and (unlike normal use) does NOT roll back.
        expect(mockUpsertSettings).toHaveBeenCalledTimes(3)
        expect(mockReport).toHaveBeenCalledTimes(1)
        expect(mockReport).toHaveBeenCalledWith('settings', expect.any(Error), expect.objectContaining({ onboarding: true }))

        // The distinguishing branch: a 4th backoff is still scheduled, so retrying continues
        // (a diff that `return`ed here like normal use would leave this at 3).
        await act(async () => {
            jest.advanceTimersByTime(persistBackoffMs(2))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(4)

        await act(async () => {
            root.unmount()
        })
    })

    it('rollback does not clobber a newer edit that arrived after the disk read started (M15 canary)', async () => {
        jest.useFakeTimers()
        const reloadRead = createDeferred<LoadResult>()
        // Initial load returns calorieGoal 2000; the rollback re-read returns the STALE disk snapshot (999).
        mockLoadSettingsAndBw
            .mockResolvedValueOnce({ settings: makeSettings({ calorieGoal: 2000 }), bwProgress: {}, hasData: true } as LoadResult)
            .mockReturnValue(reloadRead.promise)
        // Fail 3 times to trigger the rollback, then let the newer edit's save succeed.
        mockUpsertSettings
            .mockRejectedValueOnce(new Error('db locked'))
            .mockRejectedValueOnce(new Error('db locked'))
            .mockRejectedValueOnce(new Error('db locked'))
            .mockResolvedValue(undefined)

        const root = await mountProbe()
        expect(latest.loaded).toBe(true)

        // Edit A drives three consecutive failures → reportPersistFailure → reloadFromDisk (read pending).
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 111 }))
        })
        await act(async () => {
            jest.advanceTimersByTime(persistBackoffMs(0))
        })
        await act(async () => {
            jest.advanceTimersByTime(persistBackoffMs(1))
        })
        expect(mockReport).toHaveBeenCalledTimes(1)

        // Edit B lands while the rollback's disk read is still in flight; its own save succeeds.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 222 }))
        })
        expect(latest.settings.calorieGoal).toBe(222)

        // The stale disk read now resolves. It must NOT overwrite the newer edit.
        await act(async () => {
            reloadRead.resolve({ settings: makeSettings({ calorieGoal: 999 }), bwProgress: {}, hasData: true })
            await reloadRead.promise
        })
        expect(latest.settings.calorieGoal).toBe(222)

        await act(async () => {
            root.unmount()
        })
    })
})
