import { useAuth } from '@/context/AuthContext'
import { powerSync } from '@/lib/powersync/system'
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState, type SetStateAction } from 'react'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from './database/powersyncStore'
import { persistBackoffMs, reportPersistFailure } from '@/lib/powersync/persistErrors'
import { computeBwUpdate, getBodyWeightProgressData } from './functions/bodyWeightFunctions'
import { getDateKey } from '@/lib/utils/dateHelper'
import { calculateMacros } from './functions/macroCalculation'
import { Settings, SettingsContextInterface } from './types'

const defaultSettings: Settings = {
    onboardingComplete: false,
    onboardingCompletedAt: undefined,
    birthDate: new Date(),
    gender: 'male',
    height: 175,
    bodyWeight: 170,
    activityLevel: 'moderate',
    unitSystem: 'imperial',
    goalType: 'maintain',
    goalWeight: 190,
    goalPace: 0.5,
    calorieGoal: 2000,
    proteinGoal: 130,
    carbsGoal: 200,
    fatsGoal: 54,
}

// Settings carry the whole app's targets, so a lost save matters more than one
// entry — but still surface it to the user only after a few consecutive misses,
// giving transient failures (a brief DB lock) room to self-heal via backoff.
const SETTINGS_ALERT_AFTER = 3

const SettingsContext = createContext<SettingsContextInterface | undefined>(undefined)

export const SettingsProvider = ({ children }: PropsWithChildren) => {
    const [settings, setSettingsState] = useState<Settings>(defaultSettings)
    const [bwProgress, setBwProgressState] = useState<Record<string, number>>({})
    const [hasLoadedUserData, setHasLoadedUserData] = useState(false)
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

    // Handles a body weight update: updates state and directly persists only the two changed rows.
    // Uses functional updaters so it always builds from the latest state, even when called
    // immediately after another setSettings (e.g. onboarding4 sets height then calls this).
    const handleUpdateBw = useCallback(async (updatedWeight: number) => {
        if (updatedWeight <= 0) return

        const dateKey = getDateKey(new Date())

        setBwProgressState(prev => ({ ...prev, [dateKey]: updatedWeight }))
        setSettingsState(prev => {
            const result = computeBwUpdate(updatedWeight, prev)
            return result ? result.newSettings : prev
        })
        markSettingsPersistDirty()  // settings row persisted via persistDirty effect

        if (!userID) return
        try {
            await upsertWeightForDate(userID, dateKey, updatedWeight)
        } catch (e) {
            reportPersistFailure('settings', e, { reload: reloadFromDisk, severity: 'high', onboarding: onboardingCompleteRef.current === false })
        }
    }, [userID, markSettingsPersistDirty, reloadFromDisk])

    const handleGetBodyWeightProgressData = (onboardingCompletedAt?: Date) => getBodyWeightProgressData(bwProgress, onboardingCompletedAt)

    // Load from PowerSync via the shared status hook. On failure the loader
    // writes nothing, so prior state is preserved and status becomes 'error'
    // (never blank-defaults-presented-as-a-fresh-user).
    const { status: loadStatus, retry: retryLoad } = useAsyncLoad(async (isStale) => {
        setHasLoadedUserData(false)
        setPersistDirty(false)
        persistRetryCountRef.current = 0
        if (!userID) {
            setSettingsState(defaultSettings)
            setBwProgressState({})
            return
        }
        await powerSync.waitForFirstSync()
        const { settings, bwProgress, hasData } = await loadSettingsAndBw(userID)
        if (isStale()) return
        setSettingsState(settings)
        setBwProgressState(bwProgress)
        setHasLoadedUserData(hasData)
    }, [userID])

    const loaded = loadStatus === 'ready'
    const loadFailed = loadStatus === 'error'

    // Set hasLoadedUserData to true when user completes onboarding (so new users can save)
    useEffect(() => {
        if (settings.onboardingComplete && !hasLoadedUserData) {
            setHasLoadedUserData(true)
        }
    }, [settings.onboardingComplete, hasLoadedUserData])

    // Save settings row to PowerSync only after real mutations (persistDirty), not after cold-load hydration.
    // bwProgress is excluded — individual weight entries are persisted directly in handleUpdateBw.
    useEffect(() => {
        if (!loaded || !userID || !hasLoadedUserData || !persistDirty) return
        if (persistSavingRef.current) return

        let cancelled = false
        persistSavingRef.current = true
        void (async () => {
            try {
                await upsertSettings(userID, settings)
                if (cancelled) return
                persistRetryCountRef.current = 0
                if (persistDirtyDuringSaveRef.current) {
                    persistDirtyDuringSaveRef.current = false
                    persistSavingRef.current = false
                    setPersistDirty(true)
                    return
                }
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
            } finally {
                if (!cancelled) persistSavingRef.current = false
            }
        })()
        return () => {
            cancelled = true
            if (persistRetryTimerRef.current) {
                clearTimeout(persistRetryTimerRef.current)
                persistRetryTimerRef.current = null
            }
        }
    }, [settings, loaded, userID, hasLoadedUserData, persistDirty, persistRetryNonce, reloadFromDisk])

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
            setHasLoadedUserData(true)
            return true
        } catch (e) {
            // Sentry only (no reload — memory is still the truth); the caller
            // surfaces the failure and lets the user retry instead of navigating.
            reportPersistFailure('settings', e, { onboarding: true })
            return false
        }
    }, [settings, userID])

    return (
        <SettingsContext.Provider
            value={{
                settings,
                setSettings,
                mode,
                setMode,
                bwProgress,
                handleUpdateBw,
                handleGetBodyWeightProgressData,
                calculateMacros,
                loaded,
                loadFailed,
                retryLoad,
                completeOnboarding,
            }}
        >
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
