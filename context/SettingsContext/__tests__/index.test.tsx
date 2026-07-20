// M1 regression coverage: sign-out used to drain only the PowerSync upload queue before wiping
// SQLite. A settings change still in-memory-dirty (mid-flight upsert, backoff retry, or a stuck
// persistSavingRef/C3 wedge) never reached SQLite, so flushUploadsOrThrow saw an empty queue and
// the wipe silently discarded it. SettingsContext now registers a flusher (via registerPendingFlush)
// that unconditionally forces the LATEST in-memory settings to SQLite — deliberately NOT gated on
// persistDirty, since persistDirty is plain useState and a mount-once closure over it would read
// its creation-time value (false) forever. These tests pin that unconditional behavior directly
// against the registered flusher function, independent of the deferred persist effect's own cycle —
// this would fail against a persistDirty-gated design (the banked brief's original, pre-amendment
// shape) since the flusher is invoked here in states where persistDirty has already settled false.
//
// Modeled on context/SettingsContext/__tests__/index.persist.test.tsx (render/mock/deferred shape).

// react-test-renderer ships no bundled types (@types/react-test-renderer not installed); suppress
// the missing-declaration error (test-only runtime dep), matching the sibling persist test.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { SettingsProvider, useSettings } from '../index'
import { SettingsContextInterface } from '../types'
import { Settings } from '../types'
import { DEFAULT_SETTINGS } from '../defaults'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from '../database/powersyncStore'
import { registerPendingFlush } from '@/lib/powersync/pendingWrites'

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: 'user-1' }),
}))

jest.mock('@/lib/powersync/system', () => ({
    powerSync: { waitForFirstSync: jest.fn().mockResolvedValue(undefined) },
}))

// Sentry is only reached on failure paths none of these tests cross; mocked defensively so
// importing persistErrors never touches the real native SDK, matching index.persist.test.tsx.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }))

jest.mock('../database/powersyncStore', () => ({
    loadSettingsAndBw: jest.fn(),
    upsertSettings: jest.fn(),
    upsertWeightForDate: jest.fn(),
}))

// Captures the flusher SettingsProvider registers, so tests can invoke it directly — the same
// function signOut's flushPendingLocalWrites() would call — without going through a real sign-out.
jest.mock('@/lib/powersync/pendingWrites', () => ({
    registerPendingFlush: jest.fn(),
}))

const mockLoadSettingsAndBw = loadSettingsAndBw as jest.Mock
const mockUpsertSettings = upsertSettings as jest.Mock
const mockUpsertWeightForDate = upsertWeightForDate as jest.Mock
const mockRegisterPendingFlush = registerPendingFlush as jest.Mock

// A promise the test can resolve/reject on demand, so it can control exactly when an in-flight
// upsertSettings call settles relative to invoking the captured flusher.
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

// Mounts SettingsProvider + Probe, flushes pending microtasks, and returns the renderer.
async function mountProbe(): Promise<ReturnType<typeof create>> {
    let renderer!: ReturnType<typeof create>
    await act(async () => {
        renderer = create(
            <SettingsProvider>
                <Probe />
            </SettingsProvider>,
        )
    })
    return renderer
}

// The single flusher SettingsProvider registers at mount (via registerPendingFlush).
function capturedFlusher(): () => Promise<void> {
    const call = mockRegisterPendingFlush.mock.calls[0]
    if (!call) throw new Error('registerPendingFlush was not called')
    return call[0]
}

describe('SettingsContext sign-out pending-writes flusher', () => {
    const mockUnregister = jest.fn()

    beforeEach(() => {
        mockLoadSettingsAndBw.mockReset().mockResolvedValue({ settings: DEFAULT_SETTINGS, bwProgress: {}, hasData: false })
        mockUpsertSettings.mockReset().mockResolvedValue(undefined)
        mockUpsertWeightForDate.mockReset().mockResolvedValue(undefined)
        mockUnregister.mockReset()
        mockRegisterPendingFlush.mockReset().mockReturnValue(mockUnregister)
    })

    it('registers exactly one flusher on mount and unregisters it on unmount', async () => {
        const renderer = await mountProbe()

        expect(mockRegisterPendingFlush).toHaveBeenCalledTimes(1)
        expect(typeof capturedFlusher()).toBe('function')
        expect(mockUnregister).not.toHaveBeenCalled()

        act(() => renderer.unmount())
        expect(mockUnregister).toHaveBeenCalledTimes(1)
    })

    it('forces the latest in-memory settings to SQLite even after persistDirty has settled back to false', async () => {
        await mountProbe()
        expect(latest.loaded).toBe(true)

        const flusher = capturedFlusher()

        // A real mutation, allowed to settle: the deferred persist effect saves it and clears
        // persistDirty back to false — the exact state a stale mount-time closure would have
        // permanently (and wrongly) frozen at, causing a persistDirty-gated flusher to no-op.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 1234 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
        expect(latest.settings.calorieGoal).toBe(1234)

        mockUpsertSettings.mockClear()

        // Invoke the registered flusher directly — the same call signOut's flushPendingLocalWrites
        // makes. It must still force the write with the latest settings, unconditionally.
        await flusher()

        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
        expect(mockUpsertSettings).toHaveBeenCalledWith('user-1', expect.objectContaining({ calorieGoal: 1234 }))
    })

    it('forces the latest settings even while the deferred effect is mid-save / stuck in backoff (C3 wedge)', async () => {
        const stuckSave = createDeferred<void>()
        const flusherSave = createDeferred<void>()
        let callCount = 0
        mockUpsertSettings.mockImplementation(() => {
            callCount += 1
            return callCount === 1 ? stuckSave.promise : flusherSave.promise
        })

        await mountProbe()
        expect(latest.loaded).toBe(true)

        const flusher = capturedFlusher()

        // Mutation starts a save that stays in flight for the rest of this test — models a
        // mid-flight upsert / stuck persistSavingRef (C3) at the moment sign-out is invoked.
        await act(async () => {
            latest.setSettings((prev) => ({ ...prev, calorieGoal: 5678 }))
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)

        // The flusher does not read persistSavingRef, so it fires its own upsert regardless of
        // the still-pending save above, with the latest settings.
        let flushPromise!: Promise<void>
        act(() => {
            flushPromise = flusher()
        })
        expect(mockUpsertSettings).toHaveBeenCalledTimes(2)
        expect(mockUpsertSettings.mock.calls[1][1].calorieGoal).toBe(5678)

        // Let both settle so nothing is left dangling.
        await act(async () => {
            flusherSave.resolve()
            await flushPromise
        })
        await act(async () => {
            stuckSave.resolve()
            await stuckSave.promise
        })
    })

    it('does not write before the initial load has settled, even if the flusher is invoked', async () => {
        const pendingLoad = createDeferred<{ settings: Settings; bwProgress: Record<string, number>; hasData: boolean }>()
        mockLoadSettingsAndBw.mockReturnValue(pendingLoad.promise)

        await mountProbe()
        expect(latest.loaded).toBe(false)

        const flusher = capturedFlusher()
        await flusher()
        expect(mockUpsertSettings).not.toHaveBeenCalled()

        await act(async () => {
            pendingLoad.resolve({ settings: DEFAULT_SETTINGS, bwProgress: {}, hasData: false })
            await pendingLoad.promise
        })
        expect(latest.loaded).toBe(true)

        await flusher()
        expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
    })
})
