import { useAuth } from '@/context/AuthContext';
import { powerSync } from '@/lib/powersync/system';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";
import { loadNutritionData, saveNutritionData } from './database/powersyncStore';
import { analyzeAndAddPhoto } from "./functions/aiFunctions";
import { addNutrition, deleteNutrition, editNutrition, saveNutrition, unsaveNutrition } from "./functions/crudFunctions";
import { getMacroDataForGraph, getMacrosForDate } from "./functions/graphFunctions";
import { NutritionContextInterface, NutritionEntry } from "./types";

const NutritionContext = createContext<NutritionContextInterface | undefined>(undefined);

export const NutritionProvider = ({ children }: PropsWithChildren) => {
    //User
    const { userID } = useAuth();
    // Database Data
    const [nutritionData, setNutritionData] = useState<NutritionEntry[]>([]);
    const [savedNutritionEntries, setSavedNutritionEntries] = useState<NutritionEntry[]>([]);
    // Local Only Data
    const [loaded, setLoaded] = useState(false);
    const [hasLoadedUserData, setHasLoadedUserData] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    /** Only full `saveNutritionData` runs when true — avoids re-writing SQLite after every cold load. */
    const [persistDirty, setPersistDirty] = useState(false)
    const [persistRetryNonce, setPersistRetryNonce] = useState(0)
    const persistSavingRef = useRef(false)
    const persistDirtyDuringSaveRef = useRef(false)

    const markNutritionPersistDirty = useCallback(() => {
        if (persistSavingRef.current) {
            persistDirtyDuringSaveRef.current = true
        } else {
            setPersistDirty(true)
        }
    }, [])

    // Wrapper Functions
    const handleAddNutrition = (nutritionEntry: NutritionEntry) => {
        addNutrition(nutritionEntry, setNutritionData)
        markNutritionPersistDirty()
    }
    const handleDeleteNutrition = async (id: string) => {
        await deleteNutrition(id, setNutritionData, userID)
        // deleteNutrition already applies deletes to PowerSync — no full persist pass
    }
    const handleEditNutrition = (id: string, nutritionEntry: NutritionEntry) => {
        editNutrition(id, nutritionEntry, setNutritionData)
        markNutritionPersistDirty()
    }
    const handleSaveNutrition = (nutritionEntry: NutritionEntry) => {
        saveNutrition(nutritionEntry, setSavedNutritionEntries)
        markNutritionPersistDirty()
    }
    const handleUnsaveNutrition = async (id: string) => {
        await unsaveNutrition(id, setSavedNutritionEntries, userID)
        // unsaveNutrition already applies deletes to PowerSync
    }
    const handleAnalyzeAndAddPhoto = async (photoUri: string, userIDParam: string) => {
        await analyzeAndAddPhoto(photoUri, userIDParam, setNutritionData, selectedDate)
        markNutritionPersistDirty()
    }
    const handleGetMacrosForDate = (date: Date) => getMacrosForDate(nutritionData, date);
    const handleGetMacroDataForGraph = (macroType: 'calories' | 'protein' | 'carbs' | 'fats', onboardingCompletedAt?: Date) => 
        getMacroDataForGraph(macroType, nutritionData, onboardingCompletedAt);

    // Load from PowerSync, changes when user ID does
    useEffect(() => {
        if (!userID) {
            setNutritionData([]);
            setSavedNutritionEntries([]);
            setLoaded(true);
            setHasLoadedUserData(false);
            setPersistDirty(false);
            return;
        }

        setLoaded(false);
        setHasLoadedUserData(false);
        setPersistDirty(false);

        const loadData = async () => {
            try {
                // Wait for PowerSync to sync before loading data
                await powerSync.waitForFirstSync();

                const { nutritionData, savedNutritionEntries, hasData } = await loadNutritionData(userID);
                setNutritionData(nutritionData);
                setSavedNutritionEntries(savedNutritionEntries);
                setHasLoadedUserData(hasData);
                setLoaded(true);
            } catch (error) {
                console.warn('[NutritionContext] Failed to load nutrition data from PowerSync', error);
                setNutritionData([]);
                setSavedNutritionEntries([]);
                setHasLoadedUserData(false);
                setLoaded(true);
            }
        }
        loadData();
    }, [userID]);

    // Set hasLoadedUserData to true when user adds data (so new users can save)
    useEffect(() => {
        if ((nutritionData.length > 0 || savedNutritionEntries.length > 0) && !hasLoadedUserData) {
            setHasLoadedUserData(true);
        }
    }, [nutritionData.length, savedNutritionEntries.length, hasLoadedUserData]);

    // Save to PowerSync only after real mutations (persistDirty), not after cold-load hydration.
    useEffect(() => {
        if (!loaded || !userID || !hasLoadedUserData || !persistDirty) return
        if (persistSavingRef.current) return

        let cancelled = false
        persistSavingRef.current = true
        void (async () => {
            try {
                await saveNutritionData(userID, nutritionData, savedNutritionEntries)
                if (cancelled) return
                if (persistDirtyDuringSaveRef.current) {
                    persistDirtyDuringSaveRef.current = false
                    persistSavingRef.current = false
                    setPersistDirty(true)
                    return
                }
                setPersistDirty(false)
            } catch (e) {
                console.warn('[NutritionContext] Failed to save nutrition data to PowerSync', e)
                if (!cancelled) setPersistRetryNonce((n) => n + 1)
            } finally {
                if (!cancelled) persistSavingRef.current = false
            }
        })()
        return () => {
            cancelled = true
        }
    }, [nutritionData, savedNutritionEntries, loaded, userID, hasLoadedUserData, persistDirty, persistRetryNonce])

    return (
        <NutritionContext.Provider 
            value={{ 
                nutritionData,
                savedNutritionEntries,
                selectedDate,
                loaded,
                setSelectedDate,
                handleAddNutrition,
                handleDeleteNutrition,
                handleEditNutrition,
                handleSaveNutrition,
                handleUnsaveNutrition,
                handleAnalyzeAndAddPhoto,
                handleGetMacrosForDate,
                handleGetMacroDataForGraph,
            }}>
            {children}
        </NutritionContext.Provider>
    );
}

export function useNutrition(){
    const context = useContext(NutritionContext);
    if (!context) {
        throw new Error('useNutrition must be used within an NutritionProvider');
    }
    return context;
}