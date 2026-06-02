import { useAuth } from '@/context/AuthContext';
import { powerSync } from '@/lib/powersync/system';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { loadNutritionData, upsertNutritionEntry, upsertSavedNutritionEntry } from './database/powersyncStore';
import { analyzeAndAddPhoto } from "./functions/aiFunctions";
import { addNutrition, deleteNutrition, editNutrition, saveNutrition, unsaveNutrition } from "./functions/crudFunctions";
import { getMacroDataForGraph, getMacrosForDate, getNutritionStreakState } from "./functions/graphFunctions";
import { NutritionContextInterface, NutritionEntry } from "./types";
import uuid from 'react-native-uuid';

function savedMealName(name: string, existing: { name: string }[]): string {
    const base = name.trim()
    const taken = existing.map((e) => e.name.trim().toLowerCase())
    if (!taken.includes(base.toLowerCase())) return base
    let n = 2
    while (taken.includes(`${base.toLowerCase()} (${n})`)) n++
    return `${base} (${n})`
}

const NutritionContext = createContext<NutritionContextInterface | undefined>(undefined);

export const NutritionProvider = ({ children }: PropsWithChildren) => {
    const { userID } = useAuth();
    const [nutritionData, setNutritionData] = useState<NutritionEntry[]>([]);
    const [savedNutritionEntries, setSavedNutritionEntries] = useState<NutritionEntry[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Load from PowerSync whenever the user changes
    useEffect(() => {
        if (!userID) {
            setNutritionData([]);
            setSavedNutritionEntries([]);
            setLoaded(true);
            return;
        }

        setLoaded(false);

        const loadData = async () => {
            try {
                await powerSync.waitForFirstSync();
                const { nutritionData, savedNutritionEntries } = await loadNutritionData(userID);
                setNutritionData(nutritionData);
                setSavedNutritionEntries(savedNutritionEntries);
                setLoaded(true);
            } catch (error) {
                console.warn('[NutritionContext] Failed to load nutrition data from PowerSync', error);
                setNutritionData([]);
                setSavedNutritionEntries([]);
                setLoaded(true);
            }
        }
        loadData();
    }, [userID]);

    // Each handler updates React state immediately, then writes only the affected
    // row(s) to PowerSync — same pattern as deleteNutrition / unsaveNutrition.

    const handleAddNutrition = async (nutritionEntry: NutritionEntry) => {
        const added = addNutrition(nutritionEntry, setNutritionData);
        if (!added || !userID) return;
        try {
            await upsertNutritionEntry(nutritionEntry);
        } catch (e) {
            console.warn('[NutritionContext] Failed to persist nutrition entry to PowerSync', e);
        }
    }

    const handleDeleteNutrition = async (id: string) => {
        await deleteNutrition(id, setNutritionData, userID);
    }

    const handleEditNutrition = async (id: string, nutritionEntry: NutritionEntry) => {
        const edited = editNutrition(id, nutritionEntry, setNutritionData);
        if (!edited || !userID) return;
        try {
            await upsertNutritionEntry({ ...nutritionEntry, updatedAt: new Date() });
        } catch (e) {
            console.warn('[NutritionContext] Failed to persist nutrition edit to PowerSync', e);
        }
    }

    const handleSaveNutrition = async (logEntry: NutritionEntry) => {
        const now = new Date()
        const savedEntry: NutritionEntry = {
            ...logEntry,
            id: uuid.v4() as string,
            name: savedMealName(logEntry.name, savedNutritionEntries),
            createdAt: now,
            updatedAt: now,
        }

        const saved = saveNutrition(savedEntry, setSavedNutritionEntries);
        if (!saved || !userID) return;
        try {
            await upsertSavedNutritionEntry(savedEntry);
        } catch (e) {
            console.warn('[NutritionContext] Failed to persist saved nutrition entry to PowerSync', e);
        }
    }

    const handleUnsaveNutrition = async (id: string) => {
        await unsaveNutrition(id, setSavedNutritionEntries, userID);
    }

    const handleAnalyzeAndAddPhoto = async (photoUri: string, userIDParam: string) => {
        const entry = await analyzeAndAddPhoto(photoUri, userIDParam, setNutritionData, selectedDate);
        if (!userIDParam) return;
        try {
            await upsertNutritionEntry(entry);
        } catch (e) {
            console.warn('[NutritionContext] Failed to persist photo entry to PowerSync', e);
        }
    }

    const handleGetMacrosForDate = (date: Date) => getMacrosForDate(nutritionData, date);
    const handleGetMacroDataForGraph = (macroType: 'calories' | 'protein' | 'carbs' | 'fats', onboardingCompletedAt?: Date) =>
        getMacroDataForGraph(macroType, nutritionData, onboardingCompletedAt);

    const nutritionStreak = useMemo(
        () => getNutritionStreakState(nutritionData),
        [nutritionData],
    );

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
                nutritionStreak,
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
