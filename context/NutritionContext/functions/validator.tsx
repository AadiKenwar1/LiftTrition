// context/NutritionContext/functions/validator.tsx
import { Alert } from 'react-native';
import { NutritionEntry } from "../types";

/**
 * Pure validity check for nutrition macro values — no side effects. Returns the first
 * problem's message, or null when the entry is valid. Callers that want an alert use
 * validateNutritionEntry; callers that surface their own error read the message directly.
 */
export function nutritionEntryError(entry: Partial<NutritionEntry>): string | null {
    for (const value of [entry.protein, entry.carbs, entry.fats, entry.calories]) {
        if (value !== undefined && !Number.isFinite(value)) {
            return 'Please enter a valid number';
        }
    }
    if (entry.protein !== undefined && entry.protein < 0) return 'Protein cannot be negative';
    if (entry.carbs !== undefined && entry.carbs < 0) return 'Carbs cannot be negative';
    if (entry.fats !== undefined && entry.fats < 0) return 'Fats cannot be negative';
    if (entry.calories !== undefined && entry.calories < 0) return 'Calories cannot be negative';
    return null;
}

/**
 * Validates user-inputted nutrition values
 * Returns false if validation fails and shows alert
 */
export function validateNutritionEntry(entry: Partial<NutritionEntry>): boolean {
    const error = nutritionEntryError(entry);
    if (error) {
        Alert.alert('Invalid Input', error);
        return false;
    }
    return true;
}