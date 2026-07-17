export interface FoodDescriptionPreview {
    basis: string
    calories: number
    protein: number
    carbs: number
    fats: number
}

// FatSecret search results carry a one-line summary like:
//   "Per 100g - Calories: 195kcal | Fat: 7.72g | Carbs: 0.00g | Protein: 29.55g"
// Returns null when the line doesn't match — callers degrade to no preview.
const PATTERN = /^Per\s+(.+?)\s*-\s*Calories:\s*([\d.]+)\s*kcal\s*\|\s*Fat:\s*([\d.]+)\s*g\s*\|\s*Carbs:\s*([\d.]+)\s*g\s*\|\s*Protein:\s*([\d.]+)\s*g/i

export function parseFoodDescription(description: string | undefined): FoodDescriptionPreview | null {
    if (!description) return null
    const match = description.match(PATTERN)
    if (!match) return null
    const [, basis, calories, fats, carbs, protein] = match
    const parsed = { calories: Number(calories), fats: Number(fats), carbs: Number(carbs), protein: Number(protein) }
    if (Object.values(parsed).some((v) => !Number.isFinite(v))) return null
    return { basis: `Per ${basis}`, ...parsed }
}
