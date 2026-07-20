import { PendingWritesFlushError, UploadFlushError } from '../FlushUploads'
import { flushPendingLocalWrites, registerPendingFlush } from '../pendingWrites'

// FlushUploads.ts imports powerSync/uploadQueueStats at module scope for flushUploadsOrThrow (not
// used here), so these need mocking purely to avoid system.ts's real PowerSyncDatabase constructor
// running under Jest — matching flushUploads.test.ts's setup.
jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        currentStatus: { connected: true },
        getUploadQueueStats: jest.fn().mockResolvedValue({}),
    },
}))

jest.mock('@/lib/powersync/uploadQueueStats', () => ({
    getPendingUploadEstimate: jest.fn(),
}))

// Registered flushers persist across tests in the module-level Set (no reset hook is exposed —
// there's exactly one live provider registering in production), so every test unregisters
// whatever it added before finishing.
describe('pendingWrites registry', () => {
    it('does nothing when no flushers are registered', async () => {
        await expect(flushPendingLocalWrites()).resolves.toBeUndefined()
    })

    it('awaits every registered flusher', async () => {
        const calls: string[] = []
        const unregisterA = registerPendingFlush(async () => {
            calls.push('a')
        })
        const unregisterB = registerPendingFlush(async () => {
            calls.push('b')
        })

        await flushPendingLocalWrites()

        expect(calls.sort()).toEqual(['a', 'b'])
        unregisterA()
        unregisterB()
    })

    it('stops invoking a flusher once it has been unregistered', async () => {
        const fn = jest.fn().mockResolvedValue(undefined)
        const unregister = registerPendingFlush(fn)
        unregister()

        await flushPendingLocalWrites()

        expect(fn).not.toHaveBeenCalled()
    })

    it('unregistering twice is a harmless no-op', async () => {
        const fn = jest.fn().mockResolvedValue(undefined)
        const unregister = registerPendingFlush(fn)
        unregister()
        unregister()

        await flushPendingLocalWrites()

        expect(fn).not.toHaveBeenCalled()
    })

    it('wraps a rejecting flusher in PendingWritesFlushError, which is an UploadFlushError', async () => {
        const unregister = registerPendingFlush(async () => {
            throw new Error('disk locked')
        })

        const error = await flushPendingLocalWrites().catch((e: unknown) => e)

        expect(error).toBeInstanceOf(PendingWritesFlushError)
        expect(error).toBeInstanceOf(UploadFlushError)
        unregister()
    })
})
