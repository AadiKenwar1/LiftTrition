// Fake, mutable stand-in for the PowerSync client so we can drive waitForFirstSync's
// resolution and the hasSynced flag independently. currentStatus is a getter so a test
// can flip hasSynced after the promise is already in flight.
const mockWaitForFirstSync = jest.fn()
const mockStatus: { hasSynced: boolean } = { hasSynced: false }

jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        get currentStatus() {
            return mockStatus
        },
        waitForFirstSync: (signal: AbortSignal) => mockWaitForFirstSync(signal),
    },
}))

import { FIRST_SYNC_TIMEOUT_MS, FirstSyncTimeoutError, waitForFirstSyncOrThrow } from '../waitForFirstSync'

describe('waitForFirstSyncOrThrow', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        mockWaitForFirstSync.mockReset()
        mockStatus.hasSynced = false
    })

    afterEach(() => {
        jest.clearAllTimers()
        jest.useRealTimers()
    })

    it('resolves and clears the timeout when the first sync completes in time', async () => {
        mockStatus.hasSynced = true
        mockWaitForFirstSync.mockResolvedValue(undefined)

        await expect(waitForFirstSyncOrThrow(FIRST_SYNC_TIMEOUT_MS)).resolves.toBeUndefined()

        // The finally cleared the timer, so nothing is left pending to fire a stray abort.
        expect(jest.getTimerCount()).toBe(0)
    })

    it('rejects with FirstSyncTimeoutError when the sync never completes', async () => {
        // Model the SDK contract: waitForFirstSync(signal) RESOLVES (does not reject) once the signal aborts.
        mockWaitForFirstSync.mockImplementation(
            (signal: AbortSignal) =>
                new Promise<void>((resolve) => {
                    signal.addEventListener('abort', () => resolve())
                }),
        )
        mockStatus.hasSynced = false

        const promise = waitForFirstSyncOrThrow(FIRST_SYNC_TIMEOUT_MS)
        const expectation = expect(promise).rejects.toBeInstanceOf(FirstSyncTimeoutError)
        await jest.advanceTimersByTimeAsync(FIRST_SYNC_TIMEOUT_MS)
        await expectation

        expect(jest.getTimerCount()).toBe(0)
        expect(mockWaitForFirstSync).toHaveBeenCalledTimes(1)
    })

    it('does not resolve one tick before the timeout fires', async () => {
        mockWaitForFirstSync.mockImplementation(
            (signal: AbortSignal) =>
                new Promise<void>((resolve) => {
                    signal.addEventListener('abort', () => resolve())
                }),
        )

        const promise = waitForFirstSyncOrThrow(FIRST_SYNC_TIMEOUT_MS)
        let settled = false
        void promise.then(
            () => {
                settled = true
            },
            () => {
                settled = true
            },
        )

        await jest.advanceTimersByTimeAsync(FIRST_SYNC_TIMEOUT_MS - 1)
        expect(settled).toBe(false)

        // Attach the rejection handler before the abort fires to avoid an unhandled rejection.
        const expectation = expect(promise).rejects.toBeInstanceOf(FirstSyncTimeoutError)
        await jest.advanceTimersByTimeAsync(1)
        await expectation
    })

    it('does not un-reject if the underlying wait resolves late (hasSynced was false at the abort)', async () => {
        let resolveWait!: () => void
        mockWaitForFirstSync.mockImplementation(
            (signal: AbortSignal) =>
                new Promise<void>((resolve) => {
                    resolveWait = resolve
                    signal.addEventListener('abort', () => resolve())
                }),
        )
        mockStatus.hasSynced = false

        const promise = waitForFirstSyncOrThrow(FIRST_SYNC_TIMEOUT_MS)
        const expectation = expect(promise).rejects.toBeInstanceOf(FirstSyncTimeoutError)
        await jest.advanceTimersByTimeAsync(FIRST_SYNC_TIMEOUT_MS)
        await expectation

        // A late sync completion after the timeout cannot turn the settled rejection into a success.
        mockStatus.hasSynced = true
        resolveWait()
        await expect(promise).rejects.toBeInstanceOf(FirstSyncTimeoutError)
    })
})
