import { Dispatch, SetStateAction } from "react";
import { NutritionEntry } from "../types";
import { validateNutritionEntry } from "./validator";
import { powerSync } from '@/lib/powersync/system';

export function addNutrition( nutritionEntry: NutritionEntry, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>> ){
    if (!validateNutritionEntry(nutritionEntry)) return;
    setNutritionData(prev => [nutritionEntry, ...prev]);
}

export async function deleteNutrition( 
    id: string, 
    setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>,
    userID?: string 
){
    setNutritionData(prev => prev.filter(item => item.id !== id));
    
    // Local PowerSync has no FK CASCADE — delete child ingredient rows first.
    if (userID) {
        try {
            await powerSync.writeTransaction(async (tx) => {
                await tx.execute('DELETE FROM nutrition_entry_ingredients WHERE nutrition_entry_id = ?', [id])
                await tx.execute('DELETE FROM nutrition_entries WHERE id = ?', [id])
            })
        } catch (e) {
            console.warn('[NutritionContext] Failed to delete nutrition entry from PowerSync', e)
        }
    }
}

export function editNutrition( id: string, nutritionEntry: NutritionEntry, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>> ){
    if (!validateNutritionEntry(nutritionEntry)) return;
    setNutritionData(prev => prev.map(item => 
        item.id === id ? { ...nutritionEntry, updatedAt: new Date() }: item
    ));
}
export function saveNutrition( nutritionEntry: NutritionEntry, setSavedNutritionEntries: Dispatch<SetStateAction<NutritionEntry[]>> ){
    if (!validateNutritionEntry(nutritionEntry)) return;
    setSavedNutritionEntries(prev => [nutritionEntry, ...prev]);
}

export async function unsaveNutrition( 
    id: string, 
    setSavedNutritionEntries: Dispatch<SetStateAction<NutritionEntry[]>>,
    userID?: string 
){
    setSavedNutritionEntries(prev => prev.filter(item => item.id !== id));
    
    if (userID) {
        try {
            await powerSync.writeTransaction(async (tx) => {
                await tx.execute('DELETE FROM saved_nutrition_entry_ingredients WHERE saved_nutrition_entry_id = ?', [id])
                await tx.execute('DELETE FROM saved_nutrition_entries WHERE id = ?', [id])
            })
        } catch (e) {
            console.warn('[NutritionContext] Failed to delete saved nutrition entry from PowerSync', e)
        }
    }
}
