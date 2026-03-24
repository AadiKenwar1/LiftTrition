import { askOpenAIText, askOpenAIVision } from '@/lib/openAI/openAI';
import { File } from 'expo-file-system';
import { Dispatch, SetStateAction } from 'react';
import uuid from 'react-native-uuid';
import { NutritionEntry } from '../types';
import { addNutrition } from './crudFunctions';

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout - please try again')), timeoutMs)
    ),
  ]);
}


// Analyze Photo Function
export async function analyzeAndAddPhoto(photoUri: string, userID: string, setNutritionData: Dispatch<SetStateAction<NutritionEntry[]>>, date: Date = new Date()): Promise<void> {
    try {
    
    //Convert photo to base64
    const file = new File(photoUri);
    const base64 = await file.base64();
    //30 second timeout for failure
    const response = await withTimeout(askOpenAIVision(`data:image/jpeg;base64,${base64}`), 30000)
    //Clean up json, then parse it to extract values
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '');
      cleanedResponse = cleanedResponse.replace(/\n?```$/, '');
      cleanedResponse = cleanedResponse.trim();
    }
    const data = JSON.parse(cleanedResponse);
    //Calculate total nutrition from ingredients
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalCalories = 0;
    for (const ingredient of data.ingredients) {
      const quantity = ingredient.quantity || 1;
      totalProtein += (ingredient.protein || 0) * quantity;
      totalCarbs += (ingredient.carbs || 0) * quantity;
      totalFats += (ingredient.fats || 0) * quantity;
      totalCalories += (ingredient.calories || 0) * quantity;
    }
    // Create and add the nutrition item to the context
    const nutritionItem: NutritionEntry = {
      id: uuid.v4() as string,
      userId: userID,
      name: data.name || 'Photo Entry',
      date: new Date(date),
      time: Date.now(),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fats: Math.round(totalFats * 10) / 10,
      calories: Math.round(totalCalories),
      isPhoto: true,
      photoUri: photoUri,
      ingredients: data.ingredients || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addNutrition(nutritionItem, setNutritionData);

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
    //Return the macros
    return {
      calories: Math.round(data.calories || 0),
      protein: Math.round((data.protein || 0) * 10) / 10,
      carbs: Math.round((data.carbs || 0) * 10) / 10,
      fats: Math.round((data.fats || 0) * 10) / 10,
    };

  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze text');
  }
}