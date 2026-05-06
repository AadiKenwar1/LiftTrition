import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { POWERSYNC_BACKGROUND_TASK_NAME } from './backgroundPowerSyncTask'

/** Expo minimum is 15 minutes; the OS may run less often. */
const MIN_INTERVAL_MINUTES = 15

export async function registerPowerSyncBackgroundTask(): Promise<void> {
    const status = await BackgroundTask.getStatusAsync()
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
        return
    }
    const already = await TaskManager.isTaskRegisteredAsync(POWERSYNC_BACKGROUND_TASK_NAME)
    if (already) {
        return
    }
    await BackgroundTask.registerTaskAsync(POWERSYNC_BACKGROUND_TASK_NAME, {
        minimumInterval: MIN_INTERVAL_MINUTES,
    })
}

export async function unregisterPowerSyncBackgroundTask(): Promise<void> {
    try {
        await BackgroundTask.unregisterTaskAsync(POWERSYNC_BACKGROUND_TASK_NAME)
    } catch {
        /* not registered */
    }
}

export async function isPowerSyncBackgroundTaskRegistered(): Promise<boolean> {
    return TaskManager.isTaskRegisteredAsync(POWERSYNC_BACKGROUND_TASK_NAME)
}
