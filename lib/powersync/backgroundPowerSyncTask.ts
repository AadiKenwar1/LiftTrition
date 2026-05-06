/**
 * Must load early so `defineTask` runs before any background execution.
 * Import from `app/_layout.tsx` and/or via modules that load on startup.
 */
import { supabase } from '@/lib/supabase/client'
import { BackgroundTaskResult } from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { ensurePowerSyncConnected } from './orchestrator'
import { powerSync } from './system'
import { recordBackgroundSyncRun } from './backgroundSyncMetrics'

export const POWERSYNC_BACKGROUND_TASK_NAME = 'powersync-background-sync'

const SYNC_WAIT_MS = 8_000

TaskManager.defineTask(POWERSYNC_BACKGROUND_TASK_NAME, async () => {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
            await recordBackgroundSyncRun('no_session', null)
            return BackgroundTaskResult.Success
        }

        const before = powerSync.currentStatus.lastSyncedAt?.getTime()
        try {
            await ensurePowerSyncConnected('background_task')
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'unknown_error'
            await recordBackgroundSyncRun('failed', null, message)
            return BackgroundTaskResult.Failed
        }

        await new Promise<void>((resolve) => setTimeout(resolve, SYNC_WAIT_MS))

        const after = powerSync.currentStatus.lastSyncedAt?.getTime()
        const advanced = before != null && after != null && after > before

        await recordBackgroundSyncRun('success', advanced)
        return BackgroundTaskResult.Success
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'unknown_error'
        await recordBackgroundSyncRun('failed', null, message)
        return BackgroundTaskResult.Failed
    }
})
