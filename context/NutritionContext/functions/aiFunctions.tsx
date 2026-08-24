import { askOpenAIText, askOpenAIVision } from '@/lib/openAI/openAI';
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

// OpenAI sometimes wraps JSON responses in a ```json fence; strip it before parsing.
function parseJsonResponse<T>(response: string): T {
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

// Shared analysis core — turns a photo into an entry without persisting it.
export async function runPhotoAnalysis(
  photoUri: string,
  userID: string,
  mode: ScanMode = 'meal',
  signal?: AbortSignal,
): Promise<{ entry: NutritionEntry }> {
  const file = new File(photoUri);
  const base64 = await file.base64();
  // signal aborts the in-flight edge-function fetch on cancel (M8); the 30s withTimeout race
  // below is unrelated and untouched — it only bounds how long the UI waits, it does not abort.
  const response = await withTimeout(askOpenAIVision(`data:image/jpeg;base64,${base64}`, mode, signal), 30000);

  const data = parseJsonResponse<{ name?: string; ingredients?: any[] }>(response);
  // Wire key from the vision prompt contract stays "ingredients"; in-app these are items.
  const items: Item[] = Array.isArray(data.ingredients) ? data.ingredients : [];
  if (items.length === 0) {
    throw new Error('No food detected in this photo. Try a clearer picture, or add your meal manually.');
  }

  const totals = sumItems(items);

  const entry: NutritionEntry = {
    id: uuid.v4() as string,
    userId: userID,
    // A photo that found exactly one branded item is a packaged-product scan — name the entry
    // after the product; everything else keeps the model's dish-level name.
    name: (mode !== 'label' && items.length === 1 && items[0]?.brand?.trim()) || data.name || (mode === 'label' ? 'Label Entry' : 'Photo Entry'),
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

  return { entry };
}

// Analyze Photo Function — returns the created NutritionEntry so callers can persist it,
// or null when shouldCommit reports the caller no longer wants the result (e.g. swiped away).
export async function analyzeAndAddPhoto(photoUri: string, userID: string, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>, date: Date = new Date(), mode: ScanMode = 'meal', shouldCommit?: () => boolean, signal?: AbortSignal): Promise<NutritionEntry | null> {
    try {
      const { entry } = await runPhotoAnalysis(photoUri, userID, mode, signal);
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
