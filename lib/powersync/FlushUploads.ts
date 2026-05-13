import { getPendingUploadEstimate } from '@/lib/powersync/uploadQueueStats'
import { powerSync } from '@/lib/powersync/system'

export class UploadFlushTimeoutError extends Error {
    readonly name = 'UploadFlushTimeoutError'
    constructor(message = 'Timed out waiting for uploads to finish.') {
        super(message)
    }
}

export class UploadFlushNotConnectedError extends Error {
    readonly name = 'UploadFlushNotConnectedError'
    constructor(message = 'PowerSync is not connected.') {
        super(message)
    }
}

type FlushUploadsOptions = {
    /** Max time to wait for the upload queue to drain. */
    timeoutMs: number
    /** Poll interval for checking upload queue stats. */
    pollEveryMs?: number
    /** Require the queue to be empty for N consecutive polls (reduces flakiness). */
    consecutiveEmptyCount?: number
}

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait until PowerSync's upload queue is empty.
 *
 * Gate C for "safe sign out": ensures all local writes have been uploaded (or at least removed from the upload queue)
 * before clearing the local database.
 */
export async function flushUploadsOrThrow(options: FlushUploadsOptions): Promise<void> {
    const pollEveryMs = options.pollEveryMs ?? 500
    const consecutiveEmptyCount = options.consecutiveEmptyCount ?? 2
    const startedAt = Date.now()

    if (!powerSync.currentStatus.connected) {
        throw new UploadFlushNotConnectedError()
    }

    let consecutiveEmpty = 0

    while (Date.now() - startedAt < options.timeoutMs) {
        if (!powerSync.currentStatus.connected) {
            throw new UploadFlushNotConnectedError('PowerSync disconnected while waiting for uploads to finish.')
        }

        const stats = await powerSync.getUploadQueueStats()
        const pending = getPendingUploadEstimate(stats)

        if (pending !== null && pending <= 0) {
            consecutiveEmpty += 1
            if (consecutiveEmpty >= consecutiveEmptyCount) return
        } else {
            consecutiveEmpty = 0
        }

        await sleep(pollEveryMs)
    }

    throw new UploadFlushTimeoutError()
}

