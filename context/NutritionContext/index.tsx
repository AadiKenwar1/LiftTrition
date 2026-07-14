import { useAuth } from '@/context/AuthContext';
import { powerSync } from '@/lib/powersync/system';
import { useToday } from '@/lib/hooks/useToday';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadNutritionData, upsertNutritionEntry, upsertSavedNutritionEntry } from './database/powersyncStore';
import type { ScanMode } from '@/lib/openAI/mealImage';
import { analyzeAndAddPhoto } from "./functions/aiFunctions";
import { addNutrition, deleteNutrition, editNutrition, saveNutrition, unsaveNutrition } from "./functions/crudFunctions";
import { getMacroDataForGraph, getMacroForWeek, getMacrosForDate, getNutritionStreakState } from "./functions/graphFunctions";
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
    const todayKey = useToday();
    const [nutritionData, setNutritionData] = useState<NutritionEntry[]>([]);
    const [savedNutritionEntries, setSavedNutritionEntries] = useState<NutritionEntry[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    useEffect(() => {
        setSelectedDate(new Date());
    }, [todayKey]);

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

    const handleAddNutrition = useCallback(async (nutritionEntry: NutritionEntry) => {
        const added = addNutrition(nutritionEntry, setNutritionData);
        if (!added || !userID) return;
        try {
            await upsertNutritionEntry(nutritionEntry);
        } catch (e) {
            console.warn('[NutritionContext] Failed to persist nutrition entry to PowerSync', e);
        }
    }, [userID])

    const handleDeleteNutrition = useCallback(async (id: string) => {
        await deleteNutrition(id, setNutritionData, userID);
    }, [userID])

    const handleEditNutrition = useCallback(async (id: string, nutritionEntry: NutritionEntry) => {
        const edited = editNutrition(id, nutritionEntry, setNutritionData);
        if (!edited || !userID) return;
        try {
            await upsertNutritionEntry({ ...nutritionEntry, updatedAt: new Date() });
        } catch (e) {
            console.warn('[NutritionContext] Failed to persist nutrition edit to PowerSync', e);
        }
    }, [userID])

    const handleSaveNutrition = useCallback(async (logEntry: NutritionEntry) => {
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
    }, [userID, savedNutritionEntries])

    const handleUnsaveNutrition = useCallback(async (id: string) => {
        await unsaveNutrition(id, setSavedNutritionEntries, userID);
    }, [userID])

    const handleAnalyzeAndAddPhoto = useCallback(async (photoUri: string, userIDParam: string, mode: ScanMode = 'meal') => {
        const entry = await analyzeAndAddPhoto(photoUri, userIDParam, setNutritionData, selectedDate, mode);
        if (!userIDParam) return;
        try {
            await upsertNutritionEntry(entry);
        } catch (e) {
            console.warn('[NutritionContext] Failed to persist photo entry to PowerSync', e);
        }
    }, [selectedDate])

    const handleGetMacrosForDate = useCallback((date: Date) => getMacrosForDate(nutritionData, date), [nutritionData]);
    const handleGetMacroDataForGraph = useCallback((macroType: 'calories' | 'protein' | 'carbs' | 'fats', onboardingCompletedAt?: Date) =>
        getMacroDataForGraph(macroType, nutritionData, onboardingCompletedAt), [nutritionData]);
    const handleGetMacroForWeek = useCallback((macroType: 'calories' | 'protein' | 'carbs' | 'fats', weekStart: Date) =>
        getMacroForWeek(macroType, nutritionData, weekStart), [nutritionData]);

    const nutritionStreak = useMemo(
        () => getNutritionStreakState(nutritionData),
        [nutritionData, todayKey],
    );

    const value = useMemo(
        () => ({
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
            handleGetMacroForWeek,
            nutritionStreak,
        }),
        [nutritionData, savedNutritionEntries, selectedDate, loaded, handleAddNutrition, handleDeleteNutrition, handleEditNutrition, handleSaveNutrition, handleUnsaveNutrition, handleAnalyzeAndAddPhoto, handleGetMacrosForDate, handleGetMacroDataForGraph, handleGetMacroForWeek, nutritionStreak],
    );

    return (
        <NutritionContext.Provider value={value}>
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
