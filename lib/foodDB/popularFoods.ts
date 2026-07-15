import { FoodItem } from './types'

export interface PopularFood extends FoodItem {
    servingSize: string
}

// Values dumped verbatim from FatSecret (2026-07-14, one-time dev pull) so they
// match what premium search returns for the same foods.
export const POPULAR_FOODS: PopularFood[] = [
    { id: 'popular-chicken-breast', name: 'Chicken Breast', servingSize: '100 g', calories: 195, protein: 29.55, carbs: 0, fats: 7.72 },
    { id: 'popular-egg', name: 'Egg', servingSize: '1 large', calories: 74, protein: 6.29, carbs: 0.38, fats: 4.97 },
    { id: 'popular-white-rice', name: 'White Rice', servingSize: '1 cup cooked', calories: 204, protein: 4.2, carbs: 44.08, fats: 0.44 },
    { id: 'popular-brown-rice', name: 'Brown Rice', servingSize: '1 cup cooked', calories: 215, protein: 4.99, carbs: 44.42, fats: 1.74 },
    { id: 'popular-banana', name: 'Bananas', servingSize: '1 medium (7" to 7-7/8" long)', calories: 105, protein: 1.29, carbs: 26.95, fats: 0.39 },
    { id: 'popular-oatmeal', name: 'Oatmeal', servingSize: '1 cup cooked', calories: 145, protein: 6.06, carbs: 25.37, fats: 2.39 },
    { id: 'popular-ground-beef-90-10', name: 'Ground Beef 90/10', servingSize: '4 oz', calories: 190, protein: 22, carbs: 0, fats: 11 },
    { id: 'popular-salmon', name: 'Salmon', servingSize: '1 oz boneless', calories: 41, protein: 6.13, carbs: 0, fats: 1.68 },
    { id: 'popular-greek-yogurt', name: 'Greek Yogurt', servingSize: '1 cup', calories: 220, protein: 22.79, carbs: 13.59, fats: 8.53 },
    { id: 'popular-whole-milk', name: 'Whole Milk', servingSize: '1 cup', calories: 146, protein: 7.86, carbs: 11.03, fats: 7.93 },
    { id: 'popular-peanut-butter', name: 'Peanut Butter', servingSize: '1 tbsp', calories: 94, protein: 4.01, carbs: 3.13, fats: 8.06 },
    { id: 'popular-apple', name: 'Apples', servingSize: '1 medium (2-3/4" dia) (approx 3 per lb)', calories: 72, protein: 0.36, carbs: 19.06, fats: 0.23 },
    { id: 'popular-broccoli', name: 'Broccoli', servingSize: '1 cup chopped', calories: 31, protein: 2.57, carbs: 6.04, fats: 0.34 },
    { id: 'popular-sweet-potato', name: 'Sweet Potato', servingSize: '100 g', calories: 86, protein: 1.57, carbs: 20.12, fats: 0.05 },
    { id: 'popular-almonds', name: 'Almonds', servingSize: '1 almond', calories: 7, protein: 0.26, carbs: 0.24, fats: 0.61 },
    { id: 'popular-bread-whole-wheat', name: 'Whole Wheat Seed Bread', servingSize: '1 slice', calories: 142, protein: 5.46, carbs: 24.5, fats: 3.51 },
    { id: 'popular-pasta', name: 'Penne', servingSize: '1 cup cooked', calories: 220, protein: 8.07, carbs: 42.95, fats: 1.29 },
    { id: 'popular-tuna', name: 'Tuna in Water (Canned)', servingSize: '100 g', calories: 116, protein: 25.51, carbs: 0, fats: 0.82 },
    { id: 'popular-cottage-cheese', name: '4% Small Curd Cottage Cheese', servingSize: '1/2 cup', calories: 110, protein: 13, carbs: 5, fats: 5 },
    { id: 'popular-protein-powder-whey', name: 'Whey Protein Powder', servingSize: '1 scoop', calories: 130, protein: 24, carbs: 5, fats: 1.5 },
]
