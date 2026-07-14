import { Ingredient } from '../../types';
import { scaleIngredients, sumIngredients } from '../ingredients';

const ing = (partial: Partial<Ingredient>): Ingredient => ({
  name: 'x',
  quantity: 1,
  protein: 0,
  carbs: 0,
  fats: 0,
  calories: 0,
  ...partial,
});

describe('sumIngredients', () => {
  test('multiplies each macro by quantity', () => {
    expect(sumIngredients([ing({ quantity: 2, protein: 10, carbs: 20, fats: 5, calories: 100 })])).toEqual({
      protein: 20,
      carbs: 40,
      fats: 10,
      calories: 200,
    });
  });

  test('sums multiple ingredients', () => {
    const totals = sumIngredients([
      ing({ quantity: 1, protein: 10, calories: 100 }),
      ing({ quantity: 3, protein: 5, calories: 50 }),
    ]);
    expect(totals.protein).toBe(25);
    expect(totals.calories).toBe(250);
  });

  test('a missing quantity defaults to 1', () => {
    expect(sumIngredients([ing({ quantity: undefined as unknown as number, protein: 7, calories: 70 })])).toMatchObject({ protein: 7, calories: 70 });
  });

  test('an explicit 0 quantity contributes 0 (not 1)', () => {
    expect(sumIngredients([ing({ quantity: 0, protein: 40, carbs: 80, fats: 50, calories: 900 })])).toEqual({
      protein: 0,
      carbs: 0,
      fats: 0,
      calories: 0,
    });
  });

  test('0-quantity ingredient is excluded from a mixed list', () => {
    const totals = sumIngredients([
      ing({ quantity: 1, calories: 100 }),
      ing({ quantity: 0, calories: 900 }),
    ]);
    expect(totals.calories).toBe(100);
  });

  test('rounds macros to 1 decimal and calories to a whole number', () => {
    const totals = sumIngredients([ing({ quantity: 1.5, protein: 3.7, calories: 130.5 })]);
    expect(totals.protein).toBe(5.6); // 5.55 -> 5.6
    expect(totals.calories).toBe(196); // 195.75 -> 196
  });

  test('empty list is all zeros', () => {
    expect(sumIngredients([])).toEqual({ protein: 0, carbs: 0, fats: 0, calories: 0 });
  });
});

describe('scaleIngredients', () => {
  test('factor 2 doubles quantity but leaves macros unchanged', () => {
    const scaled = scaleIngredients([ing({ quantity: 1, protein: 10, carbs: 20, fats: 5, calories: 100 })], 2);
    expect(scaled).toEqual([
      ing({ quantity: 2, protein: 10, carbs: 20, fats: 5, calories: 100 }),
    ]);
  });

  test('regression: sumIngredients(scaleIngredients(list, 2)) is 2x, not 4x', () => {
    const list = [
      ing({ quantity: 1, protein: 10, carbs: 20, fats: 5, calories: 100 }),
      ing({ quantity: 2, protein: 3, carbs: 4, fats: 1, calories: 50 }),
    ];
    const base = sumIngredients(list);
    const scaledTotals = sumIngredients(scaleIngredients(list, 2));
    expect(scaledTotals).toEqual({
      protein: Math.round(base.protein * 2 * 10) / 10,
      carbs: Math.round(base.carbs * 2 * 10) / 10,
      fats: Math.round(base.fats * 2 * 10) / 10,
      calories: Math.round(base.calories * 2),
    });
  });

  test('factor 1 returns unchanged quantity/macros and copies (does not mutate input)', () => {
    const original = [ing({ quantity: 1, protein: 10, carbs: 20, fats: 5, calories: 100 })];
    const scaled = scaleIngredients(original, 1);
    expect(scaled).toEqual(original);
    expect(scaled[0]).not.toBe(original[0]);
    scaled[0].quantity = 999;
    expect(original[0].quantity).toBe(1);
  });

  test('a missing quantity scales from a default of 1', () => {
    const scaled = scaleIngredients([ing({ quantity: undefined as unknown as number, protein: 7, calories: 70 })], 3);
    expect(scaled[0].quantity).toBe(3);
    expect(scaled[0].protein).toBe(7);
    expect(scaled[0].calories).toBe(70);
  });
});
