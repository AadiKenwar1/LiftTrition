import { powerSync } from '@/lib/powersync/system'

// Max time to wait for PowerSync's first full sync before treating it as failed.
export const FIRST_SYNC_TIMEOUT_MS = 30_000

// Thrown when the first sync does not finish within the timeout, so the loader can surface retry + sign-out instead of hanging.
export class FirstSyncTimeoutError extends Error {
    constructor(timeoutMs: number = FIRST_SYNC_TIMEOUT_MS) {
        super(`PowerSync first sync did not complete within ${timeoutMs}ms`)
        this.name = 'FirstSyncTimeoutError'
    }
}

// Wait for PowerSync's first full sync, rejecting with FirstSyncTimeoutError if it does not complete within timeoutMs.
export async function waitForFirstSyncOrThrow(timeoutMs: number = FIRST_SYNC_TIMEOUT_MS): Promise<void> {
    // Use the SDK's documented abort contract: waitForFirstSync(signal) RESOLVES (never rejects) once the
    // signal fires, so aborting tears the SDK's own wait/listener down cleanly. A Promise.race against a
    // rejecting timer would instead abandon that listener on every retry — a leak on repeated offline retries.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        await powerSync.waitForFirstSync(controller.signal)
        // hasSynced distinguishes "synced right before the abort" from "aborted with no sync" — no false timeout at the ~30s boundary.
        if (!powerSync.currentStatus?.hasSynced) {
            throw new FirstSyncTimeoutError(timeoutMs)
        }
    } finally {
        clearTimeout(timer)
    }
}
