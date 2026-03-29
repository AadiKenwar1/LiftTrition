import { useAuth } from '@/context/AuthContext'
import { powerSync } from '@/lib/powersync/system'
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react'
import { loadSettingsAndBw, saveSettingsAndBw } from './database/powersyncStore'
import { getBodyWeightProgressData, updateBw } from './functions/bodyWeightFunctions'
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
    const [settings, setSettings] = useState<Settings>(defaultSettings)
    const [bwProgress, setBwProgress] = useState<Record<string, number>>({})
    const [loaded, setLoaded] = useState(false)
    const [hasLoadedUserData, setHasLoadedUserData] = useState(false)
    const [mode, setMode] = useState<boolean>(true)

    const { userID } = useAuth()

    // Wrapper Functions
    const handleUpdateBw = (updatedWeight: number) => updateBw(updatedWeight, setBwProgress, setSettings)
    const handleGetBodyWeightProgressData = (onboardingCompletedAt?: Date) => getBodyWeightProgressData(bwProgress, onboardingCompletedAt)

    // Load from PowerSync
    useEffect(() => {
        // No user: reset to defaults and mark as loaded
        if (!userID) {
            setSettings(defaultSettings)
            setBwProgress({})
            setLoaded(true)
            setHasLoadedUserData(false)
            return
        }

        // User present: start in loading state and load from PowerSync
        setLoaded(false)
        setHasLoadedUserData(false)

        const loadData = async () => {
            try {
                await powerSync.waitForFirstSync()
                const { settings, bwProgress, hasData } = await loadSettingsAndBw(userID)
                setSettings(settings)
                setBwProgress(bwProgress)
                setHasLoadedUserData(hasData)
                setLoaded(true)
            } catch (e) {
                console.warn('[SettingsContext] Failed to load settings from PowerSync', e)
                setSettings(defaultSettings)
                setBwProgress({})
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

    // Save to PowerSync - ONLY if we've loaded actual user data or user completed onboarding
    useEffect(() => {
        if (!loaded || !userID || !hasLoadedUserData) return
        saveSettingsAndBw(userID, settings, bwProgress).catch((e) => {
            console.warn('[SettingsContext] Failed to save settings to PowerSync', e)
        })
    }, [settings, bwProgress, loaded, userID, hasLoadedUserData])

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
