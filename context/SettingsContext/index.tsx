import { useAuth } from '@/context/AuthContext'
import { powerSync } from '@/lib/powersync/system'
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from './database/powersyncStore'
import { persistBackoffMs, reportPersistFailure } from '@/lib/powersync/persistErrors'
import { applySwitchToMaintenance, computeBwUpdate, getBodyWeightProgressData, type BwPrompt } from './functions/bodyWeightFunctions'
import { getDateKey } from '@/lib/utils/dateHelper'
import { calculateMacros } from './functions/macroCalculation'
import { Settings, SettingsContextInterface } from './types'
import { DEFAULT_SETTINGS } from './defaults'

// Settings carry the whole app's targets, so a lost save matters more than one
// entry — but still surface it to the user only after a few consecutive misses,
// giving transient failures (a brief DB lock) room to self-heal via backoff.
const SETTINGS_ALERT_AFTER = 3

const SettingsContext = createContext<SettingsContextInterface | undefined>(undefined)

export const SettingsProvider = ({ children }: PropsWithChildren) => {
    const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS)
    const [bwProgress, setBwProgressState] = useState<Record<string, number>>({})
    const [mode, setMode] = useState<boolean>(true)
    const [persistDirty, setPersistDirty] = useState(false)
    const [persistRetryNonce, setPersistRetryNonce] = useState(0)
    const persistSavingRef = useRef(false)
    const persistDirtyDuringSaveRef = useRef(false)
    // Consecutive save-failure count drives the backoff and the "surface after N
    // misses" threshold; the timer holds the scheduled retry so it can be cleared.
    const persistRetryCountRef = useRef(0)
    const persistRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Fresh onboarding flag for callbacks that shouldn't recreate on every edit.
    const onboardingCompleteRef = useRef(settings.onboardingComplete)
    onboardingCompleteRef.current = settings.onboardingComplete

    const markSettingsPersistDirty = useCallback(() => {
        if (persistSavingRef.current) {
            persistDirtyDuringSaveRef.current = true
        } else {
            setPersistDirty(true)
        }
    }, [])

    const setSettings = useCallback(
        (action: SetStateAction<Settings>) => {
            markSettingsPersistDirty()
            setSettingsState(action)
        },
        [markSettingsPersistDirty],
    )

    const { userID } = useAuth()

    // Silent rollback: re-read disk into state WITHOUT touching load status, so a
    // failed write reverts in place instead of flipping loaded→false (which makes
    // the app-wide gate unmount the navigator back to the home tab). Also clears
    // the dirty flag and retry count so the rolled-back change stops retrying.
    // userID is read through a ref to keep this referentially stable.
    const userIDRef = useRef(userID)
    userIDRef.current = userID
    const reloadFromDisk = useCallback(async () => {
        const uid = userIDRef.current
        if (!uid) return
        try {
            const { settings: fresh, bwProgress: freshBw } = await loadSettingsAndBw(uid)
            setSettingsState(fresh)
            setBwProgressState(freshBw)
            setPersistDirty(false)
            persistRetryCountRef.current = 0
        } catch {
            // Best-effort rollback; the original failure was already reported.
        }
    }, [])

    // Pending goal-reached prompt, raised by handleUpdateBw and rendered once by
    // GoalPromptHost in the root layout — so every weigh-in entry point shows it
    // over whatever screen remains after its own sheet closes. Deliberately ephemeral
    // in-memory state: if the process dies, the progress-screen banner is the survivor.
    const [pendingGoalPrompt, setPendingGoalPrompt] = useState<BwPrompt | null>(null)
    const dismissGoalPrompt = useCallback(() => setPendingGoalPrompt(null), [])

    // Handles a body weight update: updates state and directly persists only the two changed rows.
    // Uses functional updaters so it always builds from the latest state, even when called
    // immediately after another setSettings (e.g. onboarding4 sets height then calls this).
    // The goal prompt is recomputed from closure settings: cheap, pure, and its inputs
    // (goal fields + previous weight) are never part of the same-tick setSettings that
    // precedes this call.
    const handleUpdateBw = useCallback(async (updatedWeight: number): Promise<void> => {
        if (updatedWeight <= 0) return

        const dateKey = getDateKey(new Date())

        setBwProgressState(prev => ({ ...prev, [dateKey]: updatedWeight }))
        setSettingsState(prev => {
            const result = computeBwUpdate(updatedWeight, prev)
            return result ? result.newSettings : prev
        })
        markSettingsPersistDirty()  // settings row persisted via persistDirty effect

        const prompt = computeBwUpdate(updatedWeight, settings)?.prompt ?? null
        if (prompt) setPendingGoalPrompt(prompt)

        // Weight-row persist stays fire-and-forget so callers never wait on the DB write.
        if (userID) {
            void upsertWeightForDate(userID, dateKey, updatedWeight).catch((e) => {
                reportPersistFailure('settings', e, { reload: reloadFromDisk, severity: 'high', onboarding: onboardingCompleteRef.current === false })
            })
        }
    }, [userID, settings, markSettingsPersistDirty, reloadFromDisk])

    // Consented goal-prompt actions (issue 8): the only two intent changes the app may
    // apply on the user's behalf, each a single explicit tap.
    const switchToMaintenance = useCallback(() => {
        setSettings(prev => applySwitchToMaintenance(prev))
    }, [setSettings])

    const acknowledgeGoalOvershoot = useCallback(() => {
        setSettings(prev => ({ ...prev, goalOvershootAcknowledged: true }))
    }, [setSettings])

    // Body-weight progress series for the Progress chart; memoized on bwProgress so it keeps a
    // stable identity — this both feeds the value memo below and stops progress.tsx's topRawData
    // useMemo (which lists this as a dep) from being defeated on every SettingsProvider render.
    const handleGetBodyWeightProgressData = useCallback(
        (onboardingCompletedAt?: Date) => getBodyWeightProgressData(bwProgress, onboardingCompletedAt),
        [bwProgress],
    )

    // Load from PowerSync via the shared status hook. On failure the loader
    // writes nothing, so prior state is preserved and status becomes 'error'
    // (never blank-defaults-presented-as-a-fresh-user).
    const { status: loadStatus, retry: retryLoad } = useAsyncLoad(async (isStale) => {
        setPersistDirty(false)
        setPendingGoalPrompt(null)
        persistRetryCountRef.current = 0
        if (!userID) {
            setSettingsState(DEFAULT_SETTINGS)
            setBwProgressState({})
            return
        }
        await powerSync.waitForFirstSync()
        const { settings, bwProgress } = await loadSettingsAndBw(userID)
        if (isStale()) return
        setSettingsState(settings)
        setBwProgressState(bwProgress)
    }, [userID])

    const loaded = loadStatus === 'ready'
    const loadFailed = loadStatus === 'error'

    // Save settings row to PowerSync only after real mutations (persistDirty), not after cold-load hydration.
    // bwProgress is excluded — individual weight entries are persisted directly in handleUpdateBw.
    useEffect(() => {
        if (!loaded || !userID || !persistDirty) return
        if (persistSavingRef.current) return

        let cancelled = false
        let scheduledBackoff = false
        persistSavingRef.current = true
        void (async () => {
            try {
                await upsertSettings(userID, settings)
                if (cancelled) return
                persistRetryCountRef.current = 0
                setPersistDirty(false)
            } catch (e) {
                if (cancelled) return
                const attempt = persistRetryCountRef.current
                persistRetryCountRef.current = attempt + 1
                const onboarding = !settings.onboardingComplete
                // After a few misses, stop failing silently. Normal use: alert and
                // roll back to disk (which clears persistDirty and ends the loop).
                // Onboarding: stay silent and keep retrying — memory is the truth.
                if (persistRetryCountRef.current >= SETTINGS_ALERT_AFTER) {
                    reportPersistFailure('settings', e, { reload: reloadFromDisk, severity: 'high', onboarding })
                    if (!onboarding) return
                }
                // Back off instead of hot-looping: 1s, 2s, 4s… capped at 30s.
                persistRetryTimerRef.current = setTimeout(() => setPersistRetryNonce((n) => n + 1), persistBackoffMs(attempt))
                scheduledBackoff = true
            } finally {
                // Release the mutex unconditionally. A cancelled run's re-run already bailed
                // at the guard above (persistSavingRef still held), so a conditional release
                // here would wedge the mutex true forever and strand every later mutation in
                // persistDirtyDuringSaveRef, which nothing would ever consume again.
                persistSavingRef.current = false
                // Re-fire the loop for a mutation that landed mid-save. Skip the bump when a
                // backoff retry is already pending (non-cancelled failure path): bumping the
                // nonce would re-run the effect, whose cleanup clears the just-scheduled
                // persistRetryTimerRef and forces an immediate retry, defeating the 1s/2s/4s
                // backoff. Only re-arm where NO backoff is pending: success-with-dirty, or a
                // cancelled run whose re-run bailed at the mutex.
                if (persistDirtyDuringSaveRef.current && !scheduledBackoff) {
                    persistDirtyDuringSaveRef.current = false
                    setPersistDirty(true)
                    setPersistRetryNonce((n) => n + 1)
                }
            }
        })()
        return () => {
            cancelled = true
            if (persistRetryTimerRef.current) {
                clearTimeout(persistRetryTimerRef.current)
                persistRetryTimerRef.current = null
            }
        }
    }, [settings, loaded, userID, persistDirty, persistRetryNonce, reloadFromDisk])

    // The final onboarding commit is the one write we must not fire-and-forget:
    // if it's lost, the route guard drops the user back into onboarding on next
    // launch. Persist it directly and report success, so the caller can gate
    // navigation on the write actually landing (not the debounced effect).
    const completeOnboarding = useCallback(async (): Promise<boolean> => {
        const next: Settings = { ...settings, onboardingComplete: true, onboardingCompletedAt: new Date() }
        if (!userID) {
            setSettingsState(next)
            return true
        }
        try {
            await upsertSettings(userID, next)
            setSettingsState(next)
            return true
        } catch (e) {
            // Sentry only (no reload — memory is still the truth); the caller
            // surfaces the failure and lets the user retry instead of navigating.
            reportPersistFailure('settings', e, { onboarding: true })
            return false
        }
    }, [settings, userID])

    // Memoized provider value: a stable reference so the whole consumer tree re-renders only
    // when an exposed field changes — NOT on the persistDirty / persistRetryNonce save-cycle
    // flips, which are provider-local (not in this object) and so are deliberately excluded
    // from the deps; the settled `settings` they eventually produce is a dep and still propagates.
    const value = useMemo(
        () => ({
            settings,
            setSettings,
            mode,
            setMode,
            bwProgress,
            handleUpdateBw,
            pendingGoalPrompt,
            dismissGoalPrompt,
            switchToMaintenance,
            acknowledgeGoalOvershoot,
            handleGetBodyWeightProgressData,
            calculateMacros,
            loaded,
            loadFailed,
            retryLoad,
            completeOnboarding,
        }),
        [settings, setSettings, mode, setMode, bwProgress, handleUpdateBw, pendingGoalPrompt, dismissGoalPrompt, switchToMaintenance, acknowledgeGoalOvershoot, handleGetBodyWeightProgressData, calculateMacros, loaded, loadFailed, retryLoad, completeOnboarding],
    )

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

//Custom hook
export function useSettings() {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error('useSettings must be used within an SettingsProvider')
    }
    return context
}
