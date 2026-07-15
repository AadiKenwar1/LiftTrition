import { POPULAR_FOODS } from '../popularFoods'

describe('POPULAR_FOODS', () => {
    it('has entries', () => {
        expect(POPULAR_FOODS.length).toBeGreaterThan(0)
    })

    it('has unique ids', () => {
        const ids = POPULAR_FOODS.map((f) => f.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('every entry has a name, serving and non-negative macros', () => {
        for (const f of POPULAR_FOODS) {
            expect(f.name.trim().length).toBeGreaterThan(0)
            expect(f.servingSize.trim().length).toBeGreaterThan(0)
            expect(f.calories).toBeGreaterThan(0)
            for (const v of [f.protein, f.carbs, f.fats]) {
                expect(v).toBeGreaterThanOrEqual(0)
                expect(Number.isFinite(v)).toBe(true)
            }
        }
    })
})
