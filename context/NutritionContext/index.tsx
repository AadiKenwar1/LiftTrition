import { useAuth } from '@/context/AuthContext';
import { powerSync } from '@/lib/powersync/system';
import { useToday } from '@/lib/hooks/useToday';
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadNutritionData, upsertNutritionEntry, upsertSavedNutritionEntry } from './database/powersyncStore';
import { reportPersistFailure } from '@/lib/powersync/persistErrors';
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
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    useEffect(() => {
        setSelectedDate(new Date());
    }, [todayKey]);

    // Load from PowerSync whenever the user changes (shared status hook).
    // On failure the loader writes nothing, so prior state is preserved and
    // status becomes 'error' instead of masquerading as a fresh user.
    const { status: loadStatus, retry: retryLoad } = useAsyncLoad(async (isStale) => {
        if (!userID) {
            setNutritionData([]);
            setSavedNutritionEntries([]);
            return;
        }
        await powerSync.waitForFirstSync();
        const { nutritionData, savedNutritionEntries } = await loadNutritionData(userID);
        if (isStale()) return;
        setNutritionData(nutritionData);
        setSavedNutritionEntries(savedNutritionEntries);
    }, [userID]);

    const loaded = loadStatus === 'ready';
    const loadFailed = loadStatus === 'error';

    // Silent rollback: re-read disk into state WITHOUT touching load status. A
    // failed write reverts in place — unlike retryLoad, which flips loaded→false
    // and makes the app-wide gate unmount the navigator back to the home tab.
    const reloadFromDisk = useCallback(async () => {
        if (!userID) return;
        try {
            const { nutritionData, savedNutritionEntries } = await loadNutritionData(userID);
            setNutritionData(nutritionData);
            setSavedNutritionEntries(savedNutritionEntries);
        } catch {
            // Best-effort rollback; the original failure was already reported.
        }
    }, [userID]);

    // Each handler updates React state immediately, then writes only the affected
    // row(s) to PowerSync — same pattern as deleteNutrition / unsaveNutrition.

    const handleAddNutrition = useCallback(async (nutritionEntry: NutritionEntry) => {
        const added = addNutrition(nutritionEntry, setNutritionData);
        if (!added || !userID) return;
        try {
            await upsertNutritionEntry(nutritionEntry);
        } catch (e) {
            reportPersistFailure('nutrition', e, { reload: reloadFromDisk });
        }
    }, [userID, reloadFromDisk])

    const handleDeleteNutrition = useCallback(async (id: string) => {
        try {
            await deleteNutrition(id, setNutritionData, userID);
        } catch (e) {
            reportPersistFailure('nutrition', e, { reload: reloadFromDisk });
        }
    }, [userID, reloadFromDisk])

    const handleEditNutrition = useCallback(async (id: string, nutritionEntry: NutritionEntry) => {
        const edited = editNutrition(id, nutritionEntry, setNutritionData);
        if (!edited || !userID) return;
        try {
            await upsertNutritionEntry({ ...nutritionEntry, updatedAt: new Date() });
        } catch (e) {
            reportPersistFailure('nutrition', e, { reload: reloadFromDisk });
        }
    }, [userID, reloadFromDisk])

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
            reportPersistFailure('nutrition', e, { reload: reloadFromDisk });
        }
    }, [userID, savedNutritionEntries, reloadFromDisk])

    const handleUnsaveNutrition = useCallback(async (id: string) => {
        try {
            await unsaveNutrition(id, setSavedNutritionEntries, userID);
        } catch (e) {
            reportPersistFailure('nutrition', e, { reload: reloadFromDisk });
        }
    }, [userID, reloadFromDisk])

    const handleAnalyzeAndAddPhoto = useCallback(async (photoUri: string, userIDParam: string, mode: ScanMode = 'meal') => {
        const entry = await analyzeAndAddPhoto(photoUri, userIDParam, setNutritionData, selectedDate, mode);
        if (!userIDParam) return;
        try {
            await upsertNutritionEntry(entry);
        } catch (e) {
            reportPersistFailure('nutrition', e, { reload: reloadFromDisk });
        }
    }, [selectedDate, reloadFromDisk])

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
            loadFailed,
            retryLoad,
        }),
        [nutritionData, savedNutritionEntries, selectedDate, loaded, loadFailed, retryLoad, handleAddNutrition, handleDeleteNutrition, handleEditNutrition, handleSaveNutrition, handleUnsaveNutrition, handleAnalyzeAndAddPhoto, handleGetMacrosForDate, handleGetMacroDataForGraph, handleGetMacroForWeek, nutritionStreak],
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
