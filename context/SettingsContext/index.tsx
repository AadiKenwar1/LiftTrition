import { useAuth } from '@/context/AuthContext'
import { powerSync } from '@/lib/powersync/system'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState, type SetStateAction } from 'react'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from './database/powersyncStore'
import { computeBwUpdate, getBodyWeightProgressData } from './functions/bodyWeightFunctions'
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

const SettingsContext = createContext<SettingsContextInterface | undefined>(undefined)

export const SettingsProvider = ({ children }: PropsWithChildren) => {
    const [settings, setSettingsState] = useState<Settings>(defaultSettings)
    const [bwProgress, setBwProgressState] = useState<Record<string, number>>({})
    const [loaded, setLoaded] = useState(false)
    const [hasLoadedUserData, setHasLoadedUserData] = useState(false)
    const [mode, setMode] = useState<boolean>(true)
    const [persistDirty, setPersistDirty] = useState(false)
    const [persistRetryNonce, setPersistRetryNonce] = useState(0)
    const persistSavingRef = useRef(false)
    const persistDirtyDuringSaveRef = useRef(false)

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

    // Handles a body weight update: updates state and directly persists only the two changed rows.
    const handleUpdateBw = useCallback(async (updatedWeight: number) => {
        const result = computeBwUpdate(updatedWeight, settings)
        if (!result) return
        setBwProgressState(prev => ({ ...prev, [result.dateKey]: updatedWeight }))
        setSettings(result.newSettings)  // marks dirty → settings row persisted via persistDirty effect
        if (!userID) return
        try {
            await upsertWeightForDate(userID, result.dateKey, updatedWeight)
        } catch (e) {
            console.warn('[SettingsContext] Failed to persist body weight', e)
        }
    }, [userID, settings, setSettings])

    const handleGetBodyWeightProgressData = (onboardingCompletedAt?: Date) => getBodyWeightProgressData(bwProgress, onboardingCompletedAt)

    // Load from PowerSync
    useEffect(() => {
        // No user: reset to defaults and mark as loaded
        if (!userID) {
            setSettingsState(defaultSettings)
            setBwProgressState({})
            setLoaded(true)
            setHasLoadedUserData(false)
            setPersistDirty(false)
            return
        }

        // User present: start in loading state and load from PowerSync
        setLoaded(false)
        setHasLoadedUserData(false)
        setPersistDirty(false)

        const loadData = async () => {
            try {
                await powerSync.waitForFirstSync()
                const { settings, bwProgress, hasData } = await loadSettingsAndBw(userID)
                setSettingsState(settings)
                setBwProgressState(bwProgress)
                setHasLoadedUserData(hasData)
                setLoaded(true)
            } catch (e) {
                console.warn('[SettingsContext] Failed to load settings from PowerSync', e)
                setSettingsState(defaultSettings)
                setBwProgressState({})
                setHasLoadedUserData(false)
                setLoaded(true)
            }
        }

        loadData()
    }, [userID])

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
                if (persistDirtyDuringSaveRef.current) {
                    persistDirtyDuringSaveRef.current = false
                    persistSavingRef.current = false
                    setPersistDirty(true)
                    return
                }
                setPersistDirty(false)
            } catch (e) {
                console.warn('[SettingsContext] Failed to save settings to PowerSync', e)
                if (!cancelled) setPersistRetryNonce((n) => n + 1)
            } finally {
                if (!cancelled) persistSavingRef.current = false
            }
        })()
        return () => {
            cancelled = true
        }
    }, [settings, loaded, userID, hasLoadedUserData, persistDirty, persistRetryNonce])

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
