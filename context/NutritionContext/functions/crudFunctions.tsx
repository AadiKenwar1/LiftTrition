import { powerSync } from '@/lib/powersync/system'
import { Dispatch, SetStateAction } from 'react'
import { NutritionEntry } from '../types'
import { validateNutritionEntry } from './validator'

export function addNutrition(nutritionEntry: NutritionEntry, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>): boolean {
    if (!validateNutritionEntry(nutritionEntry)) return false
    setNutritionData((prev) => [nutritionEntry, ...prev])
    return true
}

export async function deleteNutrition(id: string, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>, userID?: string): Promise<void> {
    setNutritionData((prev) => prev.filter((item) => item.id !== id))

    if (userID) {
        // Let a failed delete propagate — the owning context reports it and rolls
        // the optimistic removal back by reloading from disk.
        await powerSync.writeTransaction(async (tx) => {
            await tx.execute('DELETE FROM nutrition_entry_ingredients WHERE nutrition_entry_id = ?', [id])
            await tx.execute('DELETE FROM nutrition_entries WHERE id = ?', [id])
        })
    }
}

export function editNutrition(id: string, nutritionEntry: NutritionEntry, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>): boolean {
    if (!validateNutritionEntry(nutritionEntry)) return false
    setNutritionData((prev) => prev.map((item) => (item.id === id ? { ...nutritionEntry, updatedAt: new Date() } : item)))
    return true
}

export function saveNutrition(nutritionEntry: NutritionEntry, setSavedNutritionEntries: Dispatch<SetStateAction<NutritionEntry[]>>): boolean {
    if (!validateNutritionEntry(nutritionEntry)) return false
    setSavedNutritionEntries((prev) => [nutritionEntry, ...prev])
    return true
}

export function sortSavedNutritionEntries(entries: NutritionEntry[]): NutritionEntry[] {
    return [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function getFilteredSavedNutritionEntries(entries: NutritionEntry[], searchQuery: string): NutritionEntry[] {
    const sorted = sortSavedNutritionEntries(entries)
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((entry) => entry.name.toLowerCase().includes(q))
}

export async function unsaveNutrition(id: string, setSavedNutritionEntries: Dispatch<SetStateAction<NutritionEntry[]>>, userID?: string): Promise<void> {
    setSavedNutritionEntries((prev) => prev.filter((item) => item.id !== id))

    if (userID) {
        // Let a failed delete propagate — the owning context reports it and rolls
        // the optimistic removal back by reloading from disk.
        await powerSync.writeTransaction(async (tx) => {
            await tx.execute('DELETE FROM saved_nutrition_entry_ingredients WHERE saved_nutrition_entry_id = ?', [id])
            await tx.execute('DELETE FROM saved_nutrition_entries WHERE id = ?', [id])
        })
    }
}
