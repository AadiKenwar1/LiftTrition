import type {
    NutritionEntryIngredientRecord,
    NutritionEntryRecord,
    SavedNutritionEntryIngredientRecord,
    SavedNutritionEntryRecord
} from '@/lib/powersync/AppSchema';
import { powerSync } from '@/lib/powersync/system';
import { getDateKey } from '@/lib/utils/dateHelper';
import { NutritionEntry } from '../types';

// Map DB row -> NutritionEntry
function rowToNutritionEntry(
    row: NutritionEntryRecord,
    ingredients: NutritionEntryIngredientRecord[]
): NutritionEntry {
    // Parse date string in local timezone to avoid timezone issues
    // When saving, we use getDateKey() which gives "YYYY-MM-DD" in local timezone
    // When loading, we parse "YYYY-MM-DD" as local date to avoid UTC conversion issues
    let parsedDate: Date;
    if (row.date) {
        // Parse "YYYY-MM-DD" as local date, not UTC
        const [year, month, day] = row.date.split('-').map(Number);
        parsedDate = new Date(year, month - 1, day);
    } else {
        parsedDate = new Date();
    }
    
    return {
        id: row.id!,
        userId: row.user_id!,
        name: row.name!,
        date: parsedDate,
        time: row.time ?? 0,
        protein: row.protein ?? 0,
        carbs: row.carbs ?? 0,
        fats: row.fats ?? 0,
        calories: row.calories ?? 0,
        isPhoto: !!row.is_photo,
        photoUri: row.photo_uri ?? undefined,
        ingredients: ingredients.map(ing => ({
            name: ing.name!,
            quantity: ing.quantity ?? 1,
            protein: ing.protein ?? 0,
            carbs: ing.carbs ?? 0,
            fats: ing.fats ?? 0,
            calories: ing.calories ?? 0,
        })),
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
}

// Map NutritionEntry -> DB row
function nutritionEntryToRow(entry: NutritionEntry) {
    // Normalize the date to start of day in local timezone before getting the date key
    // This ensures we save the correct local date regardless of time of day
    const localDate = new Date(entry.date);
    localDate.setHours(0, 0, 0, 0);
    
    return {
        user_id: entry.userId,
        name: entry.name,
        date: getDateKey(localDate),  // Use getDateKey to get local date string (YYYY-MM-DD)
        time: entry.time,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        calories: entry.calories,
        is_photo: entry.isPhoto ? 1 : 0,
        photo_uri: entry.photoUri || null,
        created_at: entry.createdAt.toISOString(),
        updated_at: entry.updatedAt.toISOString(),
    };
}

// Map DB row -> SavedNutritionEntry
function rowToSavedNutritionEntry(
    row: SavedNutritionEntryRecord,
    ingredients: SavedNutritionEntryIngredientRecord[]
): NutritionEntry {
    return {
        id: row.id!,
        userId: row.user_id!,
        name: row.name!,
        date: new Date(), // Saved entries don't have dates
        time: 0,
        protein: row.protein ?? 0,
        carbs: row.carbs ?? 0,
        fats: row.fats ?? 0,
        calories: row.calories ?? 0,
        isPhoto: !!row.is_photo,
        photoUri: row.photo_uri ?? undefined,
        ingredients: ingredients.map(ing => ({
            name: ing.name!,
            quantity: ing.quantity ?? 1,
            protein: ing.protein ?? 0,
            carbs: ing.carbs ?? 0,
            fats: ing.fats ?? 0,
            calories: ing.calories ?? 0,
        })),
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
}

// Map SavedNutritionEntry -> DB row
function savedNutritionEntryToRow(entry: NutritionEntry) {
    return {
        user_id: entry.userId,
        name: entry.name,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        calories: entry.calories,
        is_photo: entry.isPhoto ? 1 : 0,
        photo_uri: entry.photoUri || null,
        created_at: entry.createdAt.toISOString(),
        updated_at: entry.updatedAt.toISOString(),
    };
}

// Load nutrition data from PowerSync
export async function loadNutritionData(userId: string): Promise<{
    nutritionData: NutritionEntry[];
    savedNutritionEntries: NutritionEntry[];
    hasData: boolean;
}> {
    // Load nutrition entries
    const entryRows = await powerSync.getAll(
        'SELECT * FROM nutrition_entries WHERE user_id = ? ORDER BY date DESC, time DESC',
        [userId]
    ) as NutritionEntryRecord[];

    // Load ingredients for all entries
    const entryIds = entryRows.map(row => row.id).filter((id): id is string => !!id);

    const allIngredients = entryIds.length > 0
        ? await powerSync.getAll(
            'SELECT * FROM nutrition_entry_ingredients WHERE nutrition_entry_id IN (' +
            entryIds.map(() => '?').join(',') + ')',
            entryIds
        ) as NutritionEntryIngredientRecord[]
        : [];

    // Group ingredients by entry ID
    const ingredientsByEntryId = new Map<string, NutritionEntryIngredientRecord[]>();
    for (const ing of allIngredients) {
        if (ing.nutrition_entry_id) {
            const existing = ingredientsByEntryId.get(ing.nutrition_entry_id) || [];
            existing.push(ing);
            ingredientsByEntryId.set(ing.nutrition_entry_id, existing);
        }
    }

    // Map entries with their ingredients
    const nutritionData: NutritionEntry[] = entryRows.map(row => {
        const ingredients = ingredientsByEntryId.get(row.id!) || [];
        return rowToNutritionEntry(row, ingredients);
    });

    // Load saved nutrition entries
    const savedEntryRows = await powerSync.getAll(
        'SELECT * FROM saved_nutrition_entries WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
    ) as SavedNutritionEntryRecord[];

    // Load ingredients for saved entries
    const savedEntryIds = savedEntryRows.map(row => row.id).filter((id): id is string => !!id);

    const allSavedIngredients = savedEntryIds.length > 0
        ? await powerSync.getAll(
            'SELECT * FROM saved_nutrition_entry_ingredients WHERE saved_nutrition_entry_id IN (' +
            savedEntryIds.map(() => '?').join(',') + ')',
            savedEntryIds
        ) as SavedNutritionEntryIngredientRecord[]
        : [];

    // Group saved ingredients by entry ID
    const savedIngredientsByEntryId = new Map<string, SavedNutritionEntryIngredientRecord[]>();
    for (const ing of allSavedIngredients) {
        if (ing.saved_nutrition_entry_id) {
            const existing = savedIngredientsByEntryId.get(ing.saved_nutrition_entry_id) || [];
            existing.push(ing);
            savedIngredientsByEntryId.set(ing.saved_nutrition_entry_id, existing);
        }
    }

    // Map saved entries with their ingredients
    const savedNutritionEntries: NutritionEntry[] = savedEntryRows.map(row =>
        rowToSavedNutritionEntry(row, savedIngredientsByEntryId.get(row.id!) || [])
    );

    const hasData = nutritionData.length > 0 || savedNutritionEntries.length > 0;
    return { nutritionData, savedNutritionEntries, hasData };
}

// Save nutrition data to PowerSync
// Uses writeTransaction to group all operations (best practice from PowerSync docs)
export async function saveNutritionData(
    userId: string,
    nutritionData: NutritionEntry[],
    savedNutritionEntries: NutritionEntry[]
): Promise<void> {
    await powerSync.writeTransaction(async (tx) => {
        // Save nutrition entries
        for (const entry of nutritionData) {
            const row = nutritionEntryToRow(entry);

            // Check if entry exists (PowerSync pattern: no ON CONFLICT on views)
            const existing = await tx.getAll(
                'SELECT id FROM nutrition_entries WHERE id = ?',
                [entry.id]
            ) as NutritionEntryRecord[];

            if (existing.length > 0) {
                // Update existing entry
                await tx.execute(
                    `UPDATE nutrition_entries SET
                       name = ?,
                       date = ?,
                       time = ?,
                       protein = ?,
                       carbs = ?,
                       fats = ?,
                       calories = ?,
                       is_photo = ?,
                       photo_uri = ?,
                       updated_at = datetime('now')
                     WHERE id = ?`,
                    [
                        row.name,
                        row.date,
                        row.time,
                        row.protein,
                        row.carbs,
                        row.fats,
                        row.calories,
                        row.is_photo,
                        row.photo_uri,
                        entry.id
                    ]
                );
            } else {
                // Insert new entry (PowerSync pattern: use uuid() for client-side IDs)
                await tx.execute(
                    `INSERT INTO nutrition_entries (
                       id, user_id, name, date, time, protein, carbs, fats, calories,
                       is_photo, photo_uri, created_at, updated_at
                     )
                     VALUES (
                       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                     )`,
                    [
                        entry.id,
                        row.user_id,
                        row.name,
                        row.date,
                        row.time,
                        row.protein,
                        row.carbs,
                        row.fats,
                        row.calories,
                        row.is_photo,
                        row.photo_uri,
                        row.created_at,
                        row.updated_at
                    ]
                );
            }

            // Delete old ingredients (simpler than tracking individual changes)
            await tx.execute(
                'DELETE FROM nutrition_entry_ingredients WHERE nutrition_entry_id = ?',
                [entry.id]
            );

            // Insert new ingredients
            for (const ing of entry.ingredients) {
                await tx.execute(
                    `INSERT INTO nutrition_entry_ingredients (
                       id, nutrition_entry_id, name, quantity, protein, carbs, fats, calories, created_at
                     )
                     VALUES (
                       uuid(), ?, ?, ?, ?, ?, ?, ?, datetime('now')
                     )`,
                    [
                        entry.id,
                        ing.name,
                        ing.quantity,
                        ing.protein,
                        ing.carbs,
                        ing.fats,
                        ing.calories
                    ]
                );
            }
        }

        // Save saved nutrition entries (same pattern)
        for (const entry of savedNutritionEntries) {
            const row = savedNutritionEntryToRow(entry);

            const existing = await tx.getAll(
                'SELECT id FROM saved_nutrition_entries WHERE id = ?',
                [entry.id]
            ) as SavedNutritionEntryRecord[];

            if (existing.length > 0) {
                // Update existing
                await tx.execute(
                    `UPDATE saved_nutrition_entries SET
                       name = ?,
                       protein = ?,
                       carbs = ?,
                       fats = ?,
                       calories = ?,
                       is_photo = ?,
                       photo_uri = ?,
                       updated_at = datetime('now')
                     WHERE id = ?`,
                    [
                        row.name,
                        row.protein,
                        row.carbs,
                        row.fats,
                        row.calories,
                        row.is_photo,
                        row.photo_uri,
                        entry.id
                    ]
                );
            } else {
                // Insert new
                await tx.execute(
                    `INSERT INTO saved_nutrition_entries (
                       id, user_id, name, protein, carbs, fats, calories,
                       is_photo, photo_uri, created_at, updated_at
                     )
                     VALUES (
                       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                     )`,
                    [
                        entry.id,
                        row.user_id,
                        row.name,
                        row.protein,
                        row.carbs,
                        row.fats,
                        row.calories,
                        row.is_photo,
                        row.photo_uri,
                        row.created_at,
                        row.updated_at
                    ]
                );
            }

            // Delete old ingredients
            await tx.execute(
                'DELETE FROM saved_nutrition_entry_ingredients WHERE saved_nutrition_entry_id = ?',
                [entry.id]
            );

            // Insert new ingredients
            for (const ing of entry.ingredients) {
                await tx.execute(
                    `INSERT INTO saved_nutrition_entry_ingredients (
                       id, saved_nutrition_entry_id, name, quantity, protein, carbs, fats, calories, created_at
                     )
                     VALUES (
                       uuid(), ?, ?, ?, ?, ?, ?, ?, datetime('now')
                     )`,
                    [
                        entry.id,
                        ing.name,
                        ing.quantity,
                        ing.protein,
                        ing.carbs,
                        ing.fats,
                        ing.calories
                    ]
                );
            }
        }
    });
}
