import { Ingredient } from '../../types';
import { sumIngredients } from '../ingredients';

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
