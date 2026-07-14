// context/NutritionContext/functions/validator.tsx
import { Alert } from 'react-native';
import { NutritionEntry } from "../types";

/**
 * Validates user-inputted nutrition values
 * Returns false if validation fails and shows alert
 */
export function validateNutritionEntry(entry: Partial<NutritionEntry>): boolean {
    for (const value of [entry.protein, entry.carbs, entry.fats, entry.calories]) {
        if (value !== undefined && !Number.isFinite(value)) {
            Alert.alert('Invalid Input', 'Please enter a valid number');
            return false;
        }
    }
    if (entry.protein !== undefined && entry.protein < 0) {
        Alert.alert('Invalid Input', 'Protein cannot be negative');
        return false;
    }
    if (entry.carbs !== undefined && entry.carbs < 0) {
        Alert.alert('Invalid Input', 'Carbs cannot be negative');
        return false;
    }
    if (entry.fats !== undefined && entry.fats < 0) {
        Alert.alert('Invalid Input', 'Fats cannot be negative');
        return false;
    }
    if (entry.calories !== undefined && entry.calories < 0) {
        Alert.alert('Invalid Input', 'Calories cannot be negative');
        return false;
    }
    
    return true; 
}