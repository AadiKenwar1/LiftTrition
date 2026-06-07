export interface Ingredient{
    name:string;
    quantity:number;
    protein:number;
    carbs:number;
    fats:number;
    calories:number;
}
export interface NutritionEntry{
    id: string;
    userId: string;
    name: string;
    date: Date;
    time: number;
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    isPhoto: boolean;
    photoUri?: string;
    ingredients: Ingredient[];
    createdAt: Date;
    updatedAt: Date;
}


export interface NutritionStreakState {
    loggedToday: boolean
    streakIncludingToday: number
    streakThroughYesterday: number
}

export interface NutritionContextInterface {
    nutritionData: NutritionEntry[];
    savedNutritionEntries: NutritionEntry[];
    selectedDate: Date;
    loaded: boolean;
    setSelectedDate: (date: Date) => void;
    handleAddNutrition: (nutritionEntry: NutritionEntry) => Promise<void>;
    handleDeleteNutrition: (id: string) => Promise<void>;
    handleEditNutrition: (id: string, nutritionEntry: NutritionEntry) => Promise<void>;
    handleSaveNutrition: (nutritionEntry: NutritionEntry) => Promise<void>;
    handleBumpSavedNutrition: (id: string) => Promise<void>;
    handleUnsaveNutrition: (id: string) => Promise<void>;
    handleAnalyzeAndAddPhoto: (photoUri: string, userID: string) => Promise<void>;
    handleGetMacrosForDate: (date: Date) => { totalProtein: number; totalCarbs: number; totalFats: number; totalCalories: number };
    handleGetMacroDataForGraph: (macroType: 'calories' | 'protein' | 'carbs' | 'fats', onboardingCompletedAt?: Date) => Array<{ day: string; value: number }>;
    nutritionStreak: NutritionStreakState;
}