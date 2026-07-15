import { powerSync } from '@/lib/powersync/system'
import { getPendingUploadEstimate } from '@/lib/powersync/uploadQueueStats'
import {
    flushUploadsOrThrow,
    isUploadFlushError,
    UploadFlushNotConnectedError,
    UploadFlushTimeoutError,
} from '../FlushUploads'

jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        currentStatus: { connected: true },
        getUploadQueueStats: jest.fn().mockResolvedValue({}),
    },
}))

jest.mock('@/lib/powersync/uploadQueueStats', () => ({
    getPendingUploadEstimate: jest.fn(),
}))

const status = powerSync.currentStatus as unknown as { connected: boolean }
const mockPending = getPendingUploadEstimate as jest.Mock

beforeEach(() => {
    status.connected = true
    mockPending.mockReset()
})

describe('isUploadFlushError', () => {
    it('is true for a timeout error', () => {
        expect(isUploadFlushError(new UploadFlushTimeoutError())).toBe(true)
    })

    it('is true for a not-connected error', () => {
        expect(isUploadFlushError(new UploadFlushNotConnectedError())).toBe(true)
    })

    it('is false for a plain Error', () => {
        expect(isUploadFlushError(new Error('PowerSync is not connected.'))).toBe(false)
    })

    it('is false for non-errors', () => {
        expect(isUploadFlushError(null)).toBe(false)
        expect(isUploadFlushError('offline')).toBe(false)
    })
})

describe('flushUploadsOrThrow', () => {
    it('throws UploadFlushNotConnectedError when offline, and it matches the predicate', async () => {
        status.connected = false

        const error = await flushUploadsOrThrow({ timeoutMs: 100 }).catch((e: unknown) => e)

        expect(error).toBeInstanceOf(UploadFlushNotConnectedError)
        expect(isUploadFlushError(error)).toBe(true)
    })

    it('throws UploadFlushTimeoutError when the queue never drains, and it matches the predicate', async () => {
        mockPending.mockReturnValue(1)

        const error = await flushUploadsOrThrow({ timeoutMs: 60, pollEveryMs: 10 }).catch((e: unknown) => e)

        expect(error).toBeInstanceOf(UploadFlushTimeoutError)
        expect(isUploadFlushError(error)).toBe(true)
    })

    it('resolves once the queue reports empty on consecutive polls', async () => {
        mockPending.mockReturnValue(0)

        await expect(flushUploadsOrThrow({ timeoutMs: 1000, pollEveryMs: 10 })).resolves.toBeUndefined()
    })
})
