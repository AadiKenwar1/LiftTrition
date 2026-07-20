import { PendingWritesFlushError } from './FlushUploads'

/** A flusher forces one provider's dirty in-memory state down to local SQLite. */
type PendingFlusher = () => Promise<void>

// Live registry of flushers to run before sign-out drains the PowerSync upload queue — populated
// by providers (e.g. SettingsContext) that hold state which may not yet have reached SQLite.
const pendingFlushers = new Set<PendingFlusher>()

// Register a flusher to run before sign-out; returns a function that unregisters it.
export function registerPendingFlush(fn: PendingFlusher): () => void {
    pendingFlushers.add(fn)
    return () => {
        pendingFlushers.delete(fn)
    }
}

// Await every registered flusher so no in-memory-dirty state is lost before sign-out wipes local data.
export async function flushPendingLocalWrites(): Promise<void> {
    try {
        await Promise.all(Array.from(pendingFlushers, (fn) => fn()))
    } catch (e) {
        // Omitting the message when `e` isn't an Error lets the class's own default take over,
        // instead of duplicating that fallback string here too.
        throw new PendingWritesFlushError(e instanceof Error ? e.message : undefined)
    }
}
