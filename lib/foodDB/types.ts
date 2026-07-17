// --- External Types ---
export interface FoodSearchResult {
  description: string;
  fdcId: string;
  brandName?: string;
  foodDescription?: string;
}

export interface FoodDetails {
  name: string;
  fdcId: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  brandName: string;
}

// Food item ready for use in modals/components
export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  brand?: string | null;
}

// --- Internal Types ---
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface FatSecretFood {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
}

export interface FatSecretFoodDetails extends FatSecretFood {
  calories?: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  serving_size?: string;
}
