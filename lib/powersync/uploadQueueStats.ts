/**
 * Resolve pending upload count from PowerSync's getUploadQueueStats() payload.
 * Field names vary by SDK version — keep in sync with flushUploadsOrThrow.
 */
export function getPendingUploadEstimate(stats: unknown): number | null {
    if (stats == null || typeof stats !== 'object') return null
    const s = stats as Record<string, unknown>
    const raw = s.count ?? s.entryCount ?? s.entries ?? 0
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    return null
}

export function formatUploadQueueStatsRaw(stats: unknown, maxLen = 900): string {
    try {
        const j = JSON.stringify(stats ?? null)
        return j.length > maxLen ? `${j.slice(0, maxLen)}…` : j
    } catch {
        return String(stats)
    }
}
