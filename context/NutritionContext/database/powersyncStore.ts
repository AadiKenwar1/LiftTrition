import type { NutritionEntryIngredientRecord, NutritionEntryRecord, SavedNutritionEntryIngredientRecord, SavedNutritionEntryRecord } from '@/lib/powersync/AppSchema'
import { powerSync } from '@/lib/powersync/system'
import { throwIfLoadFailureArmed } from '@/lib/devtools/forceLoadFailure'
import { throwIfSaveFailureArmed } from '@/lib/devtools/forceSaveFailure'
import { getDateKey, parseDateKey } from '@/lib/utils/dateHelper'
import { sanitizeInt, sanitizeMacro } from '@/lib/utils/number'
import { NutritionEntry } from '../types'

// Item = the DB's "ingredient" row. Table/column names keep the legacy
// *_ingredients naming (no live migration); only the code vocabulary changed.
// Map DB row -> NutritionEntry
export function rowToNutritionEntry(row: NutritionEntryRecord, items: NutritionEntryIngredientRecord[]): NutritionEntry {
    const parsedDate = row.date ? parseDateKey(row.date) : new Date()

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
        items: items.map((item) => ({
            name: item.name!,
            brand: item.brand ?? null,
            quantity: item.quantity ?? 1,
            protein: item.protein ?? 0,
            carbs: item.carbs ?? 0,
            fats: item.fats ?? 0,
            calories: item.calories ?? 0,
        })),
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    }
}

// Map NutritionEntry -> DB row
export function nutritionEntryToRow(entry: NutritionEntry) {
    const localDate = new Date(entry.date)
    localDate.setHours(0, 0, 0, 0)

    return {
        user_id: entry.userId,
        name: entry.name,
        date: getDateKey(localDate),
        time: sanitizeInt(entry.time),
        protein: sanitizeMacro(entry.protein),
        carbs: sanitizeMacro(entry.carbs),
        fats: sanitizeMacro(entry.fats),
        calories: sanitizeMacro(entry.calories),
        is_photo: entry.isPhoto ? 1 : 0,
        photo_uri: entry.photoUri || null,
        created_at: entry.createdAt.toISOString(),
        updated_at: entry.updatedAt.toISOString(),
    }
}

// Map DB row -> SavedNutritionEntry
export function rowToSavedNutritionEntry(row: SavedNutritionEntryRecord, items: SavedNutritionEntryIngredientRecord[]): NutritionEntry {
    return {
        id: row.id!,
        userId: row.user_id!,
        name: row.name!,
        date: new Date(),
        time: 0,
        protein: row.protein ?? 0,
        carbs: row.carbs ?? 0,
        fats: row.fats ?? 0,
        calories: row.calories ?? 0,
        isPhoto: !!row.is_photo,
        photoUri: row.photo_uri ?? undefined,
        items: items.map((item) => ({
            name: item.name!,
            brand: item.brand ?? null,
            quantity: item.quantity ?? 1,
            protein: item.protein ?? 0,
            carbs: item.carbs ?? 0,
            fats: item.fats ?? 0,
            calories: item.calories ?? 0,
        })),
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    }
}

// Map SavedNutritionEntry -> DB row
export function savedNutritionEntryToRow(entry: NutritionEntry) {
    return {
        user_id: entry.userId,
        name: entry.name,
        protein: sanitizeMacro(entry.protein),
        carbs: sanitizeMacro(entry.carbs),
        fats: sanitizeMacro(entry.fats),
        calories: sanitizeMacro(entry.calories),
        is_photo: entry.isPhoto ? 1 : 0,
        photo_uri: entry.photoUri || null,
        created_at: entry.createdAt.toISOString(),
        updated_at: entry.updatedAt.toISOString(),
    }
}

// Load nutrition data from PowerSync
export async function loadNutritionData(userId: string): Promise<{
    nutritionData: NutritionEntry[]
    savedNutritionEntries: NutritionEntry[]
    hasData: boolean
}> {
    if (__DEV__) await throwIfLoadFailureArmed('nutrition')

    const entryRows = (await powerSync.getAll('SELECT * FROM nutrition_entries WHERE user_id = ? ORDER BY date DESC, time DESC', [userId])) as NutritionEntryRecord[]

    const entryIds = entryRows.map((row) => row.id).filter((id): id is string => !!id)

    const allIngredients = entryIds.length > 0 ? ((await powerSync.getAll('SELECT * FROM nutrition_entry_ingredients WHERE nutrition_entry_id IN (' + entryIds.map(() => '?').join(',') + ')', entryIds)) as NutritionEntryIngredientRecord[]) : []

    const itemsByEntryId = new Map<string, NutritionEntryIngredientRecord[]>()
    for (const item of allIngredients) {
        if (item.nutrition_entry_id) {
            const existing = itemsByEntryId.get(item.nutrition_entry_id) || []
            existing.push(item)
            itemsByEntryId.set(item.nutrition_entry_id, existing)
        }
    }

    const nutritionData: NutritionEntry[] = entryRows.map((row) => {
        const items = itemsByEntryId.get(row.id!) || []
        return rowToNutritionEntry(row, items)
    })

    const savedEntryRows = (await powerSync.getAll('SELECT * FROM saved_nutrition_entries WHERE user_id = ? ORDER BY created_at DESC', [userId])) as SavedNutritionEntryRecord[]

    const savedEntryIds = savedEntryRows.map((row) => row.id).filter((id): id is string => !!id)

    const allSavedIngredients = savedEntryIds.length > 0 ? ((await powerSync.getAll('SELECT * FROM saved_nutrition_entry_ingredients WHERE saved_nutrition_entry_id IN (' + savedEntryIds.map(() => '?').join(',') + ')', savedEntryIds)) as SavedNutritionEntryIngredientRecord[]) : []

    const savedItemsByEntryId = new Map<string, SavedNutritionEntryIngredientRecord[]>()
    for (const item of allSavedIngredients) {
        if (item.saved_nutrition_entry_id) {
            const existing = savedItemsByEntryId.get(item.saved_nutrition_entry_id) || []
            existing.push(item)
            savedItemsByEntryId.set(item.saved_nutrition_entry_id, existing)
        }
    }

    const savedNutritionEntries: NutritionEntry[] = savedEntryRows.map((row) => rowToSavedNutritionEntry(row, savedItemsByEntryId.get(row.id!) || []))

    const hasData = nutritionData.length > 0 || savedNutritionEntries.length > 0
    return { nutritionData, savedNutritionEntries, hasData }
}

/**
 * Upsert a single nutrition_entries row + its ingredients.
 * Scoped to one entry — no other rows are touched.
 */
export async function upsertNutritionEntry(entry: NutritionEntry): Promise<void> {
    if (__DEV__) await throwIfSaveFailureArmed('nutrition')
    const row = nutritionEntryToRow(entry)

    await powerSync.writeTransaction(async (tx) => {
        const existing = (await tx.getAll('SELECT id FROM nutrition_entries WHERE id = ?', [entry.id])) as NutritionEntryRecord[]

        if (existing.length > 0) {
            await tx.execute(
                `UPDATE nutrition_entries SET
                   name = ?, date = ?, time = ?, protein = ?, carbs = ?,
                   fats = ?, calories = ?, is_photo = ?, photo_uri = ?,
                   updated_at = datetime('now')
                 WHERE id = ?`,
                [row.name, row.date, row.time, row.protein, row.carbs, row.fats, row.calories, row.is_photo, row.photo_uri, entry.id],
            )
        } else {
            await tx.execute(
                `INSERT INTO nutrition_entries (
                   id, user_id, name, date, time, protein, carbs, fats, calories,
                   is_photo, photo_uri, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [entry.id, row.user_id, row.name, row.date, row.time, row.protein, row.carbs, row.fats, row.calories, row.is_photo, row.photo_uri, row.created_at, row.updated_at],
            )
        }

        await tx.execute('DELETE FROM nutrition_entry_ingredients WHERE nutrition_entry_id = ?', [entry.id])
        for (const item of entry.items) {
            await tx.execute(
                `INSERT INTO nutrition_entry_ingredients (
                   id, nutrition_entry_id, name, brand, quantity, protein, carbs, fats, calories, created_at
                 ) VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [entry.id, item.name, item.brand ?? null, sanitizeMacro(item.quantity), sanitizeMacro(item.protein), sanitizeMacro(item.carbs), sanitizeMacro(item.fats), sanitizeMacro(item.calories)],
            )
        }
    })
}

/**
 * Upsert a single saved_nutrition_entries row + its ingredients.
 * Scoped to one saved entry — no other rows are touched.
 */
export async function upsertSavedNutritionEntry(entry: NutritionEntry): Promise<void> {
    if (__DEV__) await throwIfSaveFailureArmed('nutrition')
    const row = savedNutritionEntryToRow(entry)

    await powerSync.writeTransaction(async (tx) => {
        const existing = (await tx.getAll('SELECT id FROM saved_nutrition_entries WHERE id = ?', [entry.id])) as SavedNutritionEntryRecord[]

        if (existing.length > 0) {
            await tx.execute(
                `UPDATE saved_nutrition_entries SET
                   name = ?, protein = ?, carbs = ?, fats = ?, calories = ?,
                   is_photo = ?, photo_uri = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [row.name, row.protein, row.carbs, row.fats, row.calories, row.is_photo, row.photo_uri, entry.id],
            )
        } else {
            await tx.execute(
                `INSERT INTO saved_nutrition_entries (
                   id, user_id, name, protein, carbs, fats, calories,
                   is_photo, photo_uri, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [entry.id, row.user_id, row.name, row.protein, row.carbs, row.fats, row.calories, row.is_photo, row.photo_uri, row.created_at, row.updated_at],
            )
        }

        await tx.execute('DELETE FROM saved_nutrition_entry_ingredients WHERE saved_nutrition_entry_id = ?', [entry.id])
        for (const item of entry.items) {
            await tx.execute(
                `INSERT INTO saved_nutrition_entry_ingredients (
                   id, saved_nutrition_entry_id, name, brand, quantity, protein, carbs, fats, calories, created_at
                 ) VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [entry.id, item.name, item.brand ?? null, sanitizeMacro(item.quantity), sanitizeMacro(item.protein), sanitizeMacro(item.carbs), sanitizeMacro(item.fats), sanitizeMacro(item.calories)],
            )
        }
    })
}
