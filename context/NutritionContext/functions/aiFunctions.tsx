import { getFoodItem, getFoodSearchResults } from '@/lib/foodDB/foodDB';
import { askOpenAIText, askOpenAIVision, type VisionProvider } from '@/lib/openAI/openAI';
import type { ScanMode } from '@/lib/openAI/mealImage';
import { File } from 'expo-file-system';
import { Dispatch, SetStateAction } from 'react';
import uuid from 'react-native-uuid';
import { Item, NutritionEntry } from '../types';
import { addNutrition } from './crudFunctions';
import { sumItems } from './items';
import { nutritionEntryError } from './validator';

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout - please try again')), timeoutMs)
    ),
  ]);
}

// Where each item's macros came from (sources[i] aligns 1:1 with items[i]).
export type EnrichmentSource = 'fatsecret' | 'vision';

const MAX_BRANDED_ENRICH = 5;
const ENRICH_TIMEOUT_MS = 15000;

// Resolve one branded item via FatSecret (trusting its relevance ranking). On a miss or any
// FatSecret error, return null so the caller keeps the vision call's own estimate.
async function enrichBrandedItem(item: Item): Promise<Item | null> {
  const brand = item.brand?.trim();
  if (!brand) return null;

  const query = item.name && !brand.toLowerCase().includes(item.name.toLowerCase()) ? `${brand} ${item.name}` : brand;

  try {
    const results = await getFoodSearchResults(query);
    const best = results.find((r) => r.brandName) ?? results[0];
    if (best) {
      const foodItem = await getFoodItem(best);
      if (foodItem) {
        return { ...item, name: foodItem.name || item.name, protein: foodItem.protein, carbs: foodItem.carbs, fats: foodItem.fats, calories: foodItem.calories };
      }
    }
  } catch {
    // FatSecret unavailable/error → keep the vision estimate (no web fallback).
  }

  return null;
}

// Enrich all branded items (parallel, capped). Returns the enriched list plus a per-index
// source array (sources[i] === 'fatsecret' when that item was replaced by a DB match).
export async function enrichBrandedItems(items: Item[]): Promise<{ items: Item[]; sources: EnrichmentSource[] }> {
  const sources: EnrichmentSource[] = items.map(() => 'vision');
  const branded = items
    .map((item, i) => ({ item, i }))
    .filter((x) => x.item.brand && x.item.brand.trim())
    .slice(0, MAX_BRANDED_ENRICH);
  if (branded.length === 0) return { items, sources };

  const resolved = await Promise.all(branded.map((x) => enrichBrandedItem(x.item)));

  const out = [...items];
  branded.forEach((x, k) => {
    const r = resolved[k];
    if (r) {
      out[x.i] = r;
      sources[x.i] = 'fatsecret';
    }
  });

  return { items: out, sources };
}

// OpenAI sometimes wraps JSON responses in a ```json fence; strip it before parsing.
function parseJsonResponse<T>(response: string): T {
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

// Shared analysis core — returns the entry plus enrichment sources (for the dev harness),
// without persisting. `persist` controls whether it is written to the context.
export async function runPhotoAnalysis(
  photoUri: string,
  userID: string,
  mode: ScanMode = 'meal',
  provider?: VisionProvider,
  signal?: AbortSignal,
): Promise<{ entry: NutritionEntry; sources: EnrichmentSource[]; rawItems: Item[] }> {
  const file = new File(photoUri);
  const base64 = await file.base64();
  // signal aborts the in-flight edge-function fetch on cancel (M8); the 30s withTimeout race
  // below is unrelated and untouched — it only bounds how long the UI waits, it does not abort.
  const response = await withTimeout(askOpenAIVision(`data:image/jpeg;base64,${base64}`, mode, provider, signal), 30000);

  const data = parseJsonResponse<{ name?: string; ingredients?: any[] }>(response);
  // Wire key from the vision prompt contract stays "ingredients"; in-app these are items.
  let items: Item[] = Array.isArray(data.ingredients) ? data.ingredients : [];
  if (items.length === 0) {
    throw new Error('No food detected in this photo. Try a clearer picture, or add your meal manually.');
  }
  // Vision output before any DB enrichment (Path B; surfaced for the dev harness).
  const rawItems: Item[] = items;

  // Branded enrichment applies to meal AND item photos (labels already carry the printed values).
  let sources: EnrichmentSource[] = items.map(() => 'vision');
  if (mode !== 'label') {
    try {
      const enriched = await withTimeout(enrichBrandedItems(items), ENRICH_TIMEOUT_MS);
      items = enriched.items;
      sources = enriched.sources;
    } catch {
      // keep vision estimates on any enrichment failure/timeout
    }
  }

  const totals = sumItems(items);

  const entry: NutritionEntry = {
    id: uuid.v4() as string,
    userId: userID,
    // Item entries are named after the product (brand), not the generic photo label.
    name: (mode === 'item' && (items[0]?.brand || items[0]?.name)) || data.name || (mode === 'label' ? 'Label Entry' : 'Photo Entry'),
    date: new Date(),
    time: Date.now(),
    protein: totals.protein,
    carbs: totals.carbs,
    fats: totals.fats,
    calories: totals.calories,
    isPhoto: true,
    photoUri,
    items,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { entry, sources, rawItems };
}

// Analyze Photo Function — returns the created NutritionEntry so callers can persist it,
// or null when shouldCommit reports the caller no longer wants the result (e.g. swiped away).
export async function analyzeAndAddPhoto(photoUri: string, userID: string, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>, date: Date = new Date(), mode: ScanMode = 'meal', shouldCommit?: () => boolean, signal?: AbortSignal): Promise<NutritionEntry | null> {
    try {
      const { entry } = await runPhotoAnalysis(photoUri, userID, mode, undefined, signal);
      const nutritionItem: NutritionEntry = { ...entry, date: new Date(date) };
      if (shouldCommit && !shouldCommit()) return null;
      // Gate on the pure check so an invalid AI entry never reaches the DB (the manual path's
      // validator would fire its own alert; here we surface one message via the analyzing modal).
      if (nutritionEntryError(nutritionItem)) {
        throw new Error("Couldn't read that meal — try a clearer photo, or add it manually.");
      }
      addNutrition(nutritionItem, setNutritionData);
      return nutritionItem;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze photo');
  }
}

export async function analyzeText(foodName: string): Promise<{ calories: number; protein: number; carbs: number; fats: number }> {
  try {
    const response = await withTimeout(askOpenAIText(foodName), 30000);
    const data = parseJsonResponse<{ calories?: number; protein?: number; carbs?: number; fats?: number }>(response);
    const macros = {
      calories: Math.round(data.calories || 0),
      protein: Math.round((data.protein || 0) * 10) / 10,
      carbs: Math.round((data.carbs || 0) * 10) / 10,
      fats: Math.round((data.fats || 0) * 10) / 10,
    };
    // All-zero = the model couldn't recognize the food; surface a soft error instead of writing zeros.
    if (macros.calories === 0 && macros.protein === 0 && macros.carbs === 0 && macros.fats === 0) {
      throw new Error("Couldn't estimate macros for that — try rephrasing the food name.");
    }
    return macros;

  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze text');
  }
}
