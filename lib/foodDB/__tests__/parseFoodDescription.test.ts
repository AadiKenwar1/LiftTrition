import { parseFoodDescription } from '../parseFoodDescription'

describe('parseFoodDescription', () => {
    test('parses the standard FatSecret line', () => {
        expect(parseFoodDescription('Per 100g - Calories: 195kcal | Fat: 7.72g | Carbs: 0.00g | Protein: 29.55g')).toEqual({
            basis: 'Per 100g', calories: 195, fats: 7.72, carbs: 0, protein: 29.55,
        })
    })
    test('parses a non-gram serving basis', () => {
        expect(parseFoodDescription('Per 1 cup - Calories: 220kcal | Fat: 8.53g | Carbs: 13.59g | Protein: 22.79g')).toMatchObject({ basis: 'Per 1 cup', calories: 220 })
    })
    test('tolerates flexible spacing', () => {
        expect(parseFoodDescription('Per 1 bar-Calories: 190kcal |Fat: 16g| Carbs: 7g |Protein: 7g')).toMatchObject({ calories: 190, fats: 16 })
    })
    test('undefined → null (old edge function deployments)', () => {
        expect(parseFoodDescription(undefined)).toBeNull()
    })
    test('empty string → null', () => {
        expect(parseFoodDescription('')).toBeNull()
    })
    test('malformed line → null, no throw', () => {
        expect(parseFoodDescription('Chicken breast, grilled')).toBeNull()
        expect(parseFoodDescription('Per 100g - Calories: NaNkcal | Fat: g | Carbs: 0g | Protein: 0g')).toBeNull()
    })
})
