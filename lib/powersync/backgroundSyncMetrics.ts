import AsyncStorage from '@react-native-async-storage/async-storage'

const METRICS_KEY = 'powersync_bg_sync_metrics'

export type BackgroundSyncMetrics = {
    lastRunAt: string
    runCount: number
    lastResult: 'success' | 'failed' | 'no_session'
    lastSyncedAdvanced: boolean | null
    lastError?: string
}

export async function getBackgroundSyncMetrics(): Promise<BackgroundSyncMetrics | null> {
    const raw = await AsyncStorage.getItem(METRICS_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw) as BackgroundSyncMetrics
    } catch {
        return null
    }
}

export async function recordBackgroundSyncRun(
    result: BackgroundSyncMetrics['lastResult'],
    lastSyncedAdvanced: boolean | null,
    lastError?: string
): Promise<void> {
    const prev = await getBackgroundSyncMetrics()
    const next: BackgroundSyncMetrics = {
        lastRunAt: new Date().toISOString(),
        runCount: (prev?.runCount ?? 0) + 1,
        lastResult: result,
        lastSyncedAdvanced,
        lastError,
    }
    await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(next))
}
