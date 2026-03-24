import { useAuth } from '@/context/AuthContext';
import { powerSync } from '@/lib/powersync/system';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
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


    // Wrapper Functions
    const handleAddNutrition = (nutritionEntry: NutritionEntry) => addNutrition(nutritionEntry, setNutritionData);
    const handleDeleteNutrition = async (id: string) => {
        await deleteNutrition(id, setNutritionData, userID);
    };
    const handleEditNutrition = (id: string, nutritionEntry: NutritionEntry) => editNutrition(id, nutritionEntry, setNutritionData);
    const handleSaveNutrition = (nutritionEntry: NutritionEntry) => saveNutrition(nutritionEntry, setSavedNutritionEntries);
    const handleUnsaveNutrition = async (id: string) => {
        await unsaveNutrition(id, setSavedNutritionEntries, userID);
    };
    const handleAnalyzeAndAddPhoto = (photoUri: string, userID: string) => analyzeAndAddPhoto(photoUri, userID, setNutritionData, selectedDate);
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
            return;
        }

        setLoaded(false);
        setHasLoadedUserData(false);

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

    // Save to PowerSync - ONLY if we've loaded actual user data or user has added data
    useEffect(() => {
        if (!loaded || !userID || !hasLoadedUserData) return;
        
        saveNutritionData(userID, nutritionData, savedNutritionEntries).catch(() => {});
    }, [nutritionData, savedNutritionEntries, loaded, userID, hasLoadedUserData]);

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