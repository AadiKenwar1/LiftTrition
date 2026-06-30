import { getFoodItem, getFoodSearchResults } from '@/lib/foodDB/foodDB';
import { askOpenAIText, askOpenAIVision, type VisionProvider } from '@/lib/openAI/openAI';
import type { ScanMode } from '@/lib/openAI/mealImage';
import { File } from 'expo-file-system';
import { Dispatch, SetStateAction } from 'react';
import uuid from 'react-native-uuid';
import { Ingredient, NutritionEntry } from '../types';
import { addNutrition } from './crudFunctions';

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout - please try again')), timeoutMs)
    ),
  ]);
}

// Where each ingredient's macros came from (sources[i] aligns 1:1 with ingredients[i]).
export type EnrichmentSource = 'fatsecret' | 'vision';

const MAX_BRANDED_ENRICH = 5;
const ENRICH_TIMEOUT_MS = 15000;

// Resolve one branded ingredient via FatSecret (trusting its relevance ranking). On a miss or any
// FatSecret error, return null so the caller keeps the vision call's own estimate.
async function enrichBrandedIngredient(ing: Ingredient): Promise<Ingredient | null> {
  const brand = ing.brand?.trim();
  if (!brand) return null;

  const query = ing.name && !brand.toLowerCase().includes(ing.name.toLowerCase()) ? `${brand} ${ing.name}` : brand;

  try {
    const results = await getFoodSearchResults(query);
    const best = results.find((r) => r.brandName) ?? results[0];
    if (best) {
      const item = await getFoodItem(best);
      if (item) {
        return { ...ing, name: item.name || ing.name, protein: item.protein, carbs: item.carbs, fats: item.fats, calories: item.calories };
      }
    }
  } catch {
    // FatSecret unavailable/error → keep the vision estimate (no web fallback).
  }

  return null;
}

// Enrich all branded ingredients (parallel, capped). Returns the enriched list plus a per-index
// source array (sources[i] === 'fatsecret' when that ingredient was replaced by a DB match).
export async function enrichBrandedIngredients(ingredients: Ingredient[]): Promise<{ ingredients: Ingredient[]; sources: EnrichmentSource[] }> {
  const sources: EnrichmentSource[] = ingredients.map(() => 'vision');
  const branded = ingredients
    .map((ing, i) => ({ ing, i }))
    .filter((x) => x.ing.brand && x.ing.brand.trim())
    .slice(0, MAX_BRANDED_ENRICH);
  if (branded.length === 0) return { ingredients, sources };

  const resolved = await Promise.all(branded.map((x) => enrichBrandedIngredient(x.ing)));

  const out = [...ingredients];
  branded.forEach((x, k) => {
    const r = resolved[k];
    if (r) {
      out[x.i] = r;
      sources[x.i] = 'fatsecret';
    }
  });

  return { ingredients: out, sources };
}

function sumIngredients(ingredients: Ingredient[]) {
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalCalories = 0;
  for (const ingredient of ingredients) {
    const quantity = ingredient.quantity || 1;
    totalProtein += (ingredient.protein || 0) * quantity;
    totalCarbs += (ingredient.carbs || 0) * quantity;
    totalFats += (ingredient.fats || 0) * quantity;
    totalCalories += (ingredient.calories || 0) * quantity;
  }
  return {
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fats: Math.round(totalFats * 10) / 10,
    calories: Math.round(totalCalories),
  };
}

// Strip code fences and parse the JSON vision response.
function parseVisionResponse(response: string): { name?: string; ingredients?: any[] } {
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
): Promise<{ entry: NutritionEntry; sources: EnrichmentSource[]; rawIngredients: Ingredient[] }> {
  const file = new File(photoUri);
  const base64 = await file.base64();
  const response = await withTimeout(askOpenAIVision(`data:image/jpeg;base64,${base64}`, mode, provider), 30000);

  const data = parseVisionResponse(response);
  let ingredients: Ingredient[] = Array.isArray(data.ingredients) ? data.ingredients : [];
  if (ingredients.length === 0) {
    throw new Error('No food detected in this photo. Try a clearer picture, or add your meal manually.');
  }
  // Vision output before any DB enrichment (Path B; surfaced for the dev harness).
  const rawIngredients: Ingredient[] = ingredients;

  // Branded enrichment applies to meal AND item photos (labels already carry the printed values).
  let sources: EnrichmentSource[] = ingredients.map(() => 'vision');
  if (mode !== 'label') {
    try {
      const enriched = await withTimeout(enrichBrandedIngredients(ingredients), ENRICH_TIMEOUT_MS);
      ingredients = enriched.ingredients;
      sources = enriched.sources;
    } catch {
      // keep vision estimates on any enrichment failure/timeout
    }
  }

  const totals = sumIngredients(ingredients);

  const entry: NutritionEntry = {
    id: uuid.v4() as string,
    userId: userID,
    // Item entries are named after the product (brand), not the generic photo label.
    name: (mode === 'item' && (ingredients[0]?.brand || ingredients[0]?.name)) || data.name || (mode === 'label' ? 'Label Entry' : 'Photo Entry'),
    date: new Date(),
    time: Date.now(),
    protein: totals.protein,
    carbs: totals.carbs,
    fats: totals.fats,
    calories: totals.calories,
    isPhoto: true,
    photoUri,
    ingredients,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { entry, sources, rawIngredients };
}

// Analyze Photo Function — returns the created NutritionEntry so callers can persist it.
export async function analyzeAndAddPhoto(photoUri: string, userID: string, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>, date: Date = new Date(), mode: ScanMode = 'meal'): Promise<NutritionEntry> {
    try {
      const { entry } = await runPhotoAnalysis(photoUri, userID, mode);
      const nutritionItem: NutritionEntry = { ...entry, date: new Date(date) };
      addNutrition(nutritionItem, setNutritionData);
      return nutritionItem;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze photo');
  }
}


//Analyze nutritional text input
export async function analyzeText(foodName: string): Promise<{ calories: number; protein: number; carbs: number; fats: number }> {
  try {
    //30 second timeout for failure
    const response = await withTimeout(askOpenAIText(foodName), 30000);
    //Clean up the json Response
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '');
      cleanedResponse = cleanedResponse.replace(/\n?```$/, '');
      cleanedResponse = cleanedResponse.trim();
    }
    //Parse the json Response
    const data = JSON.parse(cleanedResponse);
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
