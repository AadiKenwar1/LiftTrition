import type { FoodItem } from '@/lib/foodDB/types'
import uuid from 'react-native-uuid'
import { Item, NutritionEntry } from '../types'
import { sumItems } from './items'

// Single owner of the name rules and entry/item shapes for the
// "everything is items" model (spec: 2026-07-15-universal-item-editor-design).

export function resolveEntryName(typed: string, itemNames: string[]): string {
    const t = typed.trim()
    if (t) return t
    if (itemNames.length === 1 && itemNames[0].trim()) return itemNames[0].trim()
    return 'Unnamed Entry'
}

export function resolveCombinedName(typed: string): string {
    return typed.trim() || 'Combined Items'
}

const MAX_JOINED_NAME = 60

export function joinItemNames(items: { name: string; quantity?: number }[]): string {
    const joined = items.map((i) => ((i.quantity ?? 1) > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(' + ')
    return joined.length > MAX_JOINED_NAME ? `${joined.slice(0, MAX_JOINED_NAME - 1)}…` : joined
}

// Entries created before "everything is items" have no item rows; synthesize
// one from the entry's own totals so they open cleanly in the unified editor.
export function itemsForEntry(entry: NutritionEntry): Item[] {
    if (entry.items.length > 0) return entry.items
    return [{ name: entry.name, brand: null, quantity: 1, protein: entry.protein, carbs: entry.carbs, fats: entry.fats, calories: entry.calories }]
}

// Collapsed-row subtitle: the brand when it unambiguously fits (1 item), a
// count otherwise; per-item brands live in the editor/breakdown.
export function entrySubtitle(items: Item[]): string | null {
    if (items.length === 1) return items[0].brand?.trim() || null
    if (items.length > 1) return `${items.length} items`
    return null
}

export function foodItemToItem(food: FoodItem, quantity: number): Item {
    return { name: food.name, brand: food.brand?.trim() || null, quantity, protein: food.protein, carbs: food.carbs, fats: food.fats, calories: food.calories }
}

export function buildEntryFromItems(params: { userId: string; date: Date; name: string; items: Item[]; isPhoto?: boolean; photoUri?: string }): NutritionEntry {
    if (params.items.length === 0) throw new Error('An entry requires at least one item')
    const now = new Date()
    return {
        id: uuid.v4() as string,
        userId: params.userId,
        name: params.name,
        date: new Date(params.date),
        time: now.getTime(),
        ...sumItems(params.items),
        isPhoto: params.isPhoto ?? false,
        photoUri: params.photoUri,
        items: params.items,
        createdAt: now,
        updatedAt: now,
    }
}

// Editor save: one name for single-item entries (entry name ≡ item name).
export function applyEdits(entry: NutritionEntry, typedName: string, items: Item[]): NutritionEntry {
    const name = resolveEntryName(typedName, items.map((i) => i.name))
    const synced = items.length === 1 ? [{ ...items[0], name }] : items
    return { ...entry, name, items: synced, ...sumItems(synced) }
}
