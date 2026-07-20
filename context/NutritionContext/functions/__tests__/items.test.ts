import { sanitizeExactMacro, sanitizeMacro, sanitizeQuantity } from '@/lib/utils/number';
import { Item } from '../../types';
import { scaleItems, sumItems } from '../items';

const item = (partial: Partial<Item>): Item => ({
  name: 'x',
  quantity: 1,
  protein: 0,
  carbs: 0,
  fats: 0,
  calories: 0,
  ...partial,
});

describe('sumItems', () => {
  test('multiplies each macro by quantity', () => {
    expect(sumItems([item({ quantity: 2, protein: 10, carbs: 20, fats: 5, calories: 100 })])).toEqual({
      protein: 20,
      carbs: 40,
      fats: 10,
      calories: 200,
    });
  });

  test('sums multiple items', () => {
    const totals = sumItems([
      item({ quantity: 1, protein: 10, calories: 100 }),
      item({ quantity: 3, protein: 5, calories: 50 }),
    ]);
    expect(totals.protein).toBe(25);
    expect(totals.calories).toBe(250);
  });

  test('a missing quantity defaults to 1', () => {
    expect(sumItems([item({ quantity: undefined as unknown as number, protein: 7, calories: 70 })])).toMatchObject({ protein: 7, calories: 70 });
  });

  test('an explicit 0 quantity contributes 0 (not 1)', () => {
    expect(sumItems([item({ quantity: 0, protein: 40, carbs: 80, fats: 50, calories: 900 })])).toEqual({
      protein: 0,
      carbs: 0,
      fats: 0,
      calories: 0,
    });
  });

  test('0-quantity item is excluded from a mixed list', () => {
    const totals = sumItems([
      item({ quantity: 1, calories: 100 }),
      item({ quantity: 0, calories: 900 }),
    ]);
    expect(totals.calories).toBe(100);
  });

  test('rounds macros to 1 decimal and calories to a whole number', () => {
    const totals = sumItems([item({ quantity: 1.5, protein: 3.7, calories: 130.5 })]);
    expect(totals.protein).toBe(5.6); // 5.55 -> 5.6
    expect(totals.calories).toBe(196); // 195.75 -> 196
  });

  test('empty list is all zeros', () => {
    expect(sumItems([])).toEqual({ protein: 0, carbs: 0, fats: 0, calories: 0 });
  });
});

describe('scaleItems', () => {
  test('factor 2 doubles quantity but leaves macros unchanged', () => {
    const scaled = scaleItems([item({ quantity: 1, protein: 10, carbs: 20, fats: 5, calories: 100 })], 2);
    expect(scaled).toEqual([
      item({ quantity: 2, protein: 10, carbs: 20, fats: 5, calories: 100 }),
    ]);
  });

  test('regression: sumItems(scaleItems(list, 2)) is 2x, not 4x', () => {
    const list = [
      item({ quantity: 1, protein: 10, carbs: 20, fats: 5, calories: 100 }),
      item({ quantity: 2, protein: 3, carbs: 4, fats: 1, calories: 50 }),
    ];
    const base = sumItems(list);
    const scaledTotals = sumItems(scaleItems(list, 2));
    expect(scaledTotals).toEqual({
      protein: Math.round(base.protein * 2 * 10) / 10,
      carbs: Math.round(base.carbs * 2 * 10) / 10,
      fats: Math.round(base.fats * 2 * 10) / 10,
      calories: Math.round(base.calories * 2),
    });
  });

  test('factor 1 returns unchanged quantity/macros and copies (does not mutate input)', () => {
    const original = [item({ quantity: 1, protein: 10, carbs: 20, fats: 5, calories: 100 })];
    const scaled = scaleItems(original, 1);
    expect(scaled).toEqual(original);
    expect(scaled[0]).not.toBe(original[0]);
    scaled[0].quantity = 999;
    expect(original[0].quantity).toBe(1);
  });

  test('a missing quantity scales from a default of 1', () => {
    const scaled = scaleItems([item({ quantity: undefined as unknown as number, protein: 7, calories: 70 })], 3);
    expect(scaled[0].quantity).toBe(3);
    expect(scaled[0].protein).toBe(7);
    expect(scaled[0].calories).toBe(70);
  });

  test('scaleItems preserves each item brand', () => {
    const scaled = scaleItems([item({ quantity: 1, protein: 10, calories: 100 }), { ...item({ quantity: 2 }), brand: 'Fage' }], 2)
    expect(scaled[0].brand).toBeUndefined()
    expect(scaled[1].brand).toBe('Fage')
  })
});

// H9 regression: the ingredient-row persist transform must reconcile with the
// entry total sumItems computed from the raw item, on BOTH the quantity axis
// and the per-unit-macro axis (real foodDB/FatSecret data carries 2 decimals,
// e.g. Chicken Breast protein 29.55 — see lib/foodDB/popularFoods.ts).
describe('item persist-transform reconciliation (quantity + per-unit macros)', () => {
  // Simulates the pre-fix powersyncStore.ts:191/232 insert args (sanitizeMacro on every axis).
  const applyOldTransform = (raw: Item): Item => ({
    ...raw,
    quantity: sanitizeMacro(raw.quantity),
    protein: sanitizeMacro(raw.protein),
    carbs: sanitizeMacro(raw.carbs),
    fats: sanitizeMacro(raw.fats),
    calories: sanitizeMacro(raw.calories),
  });

  // Simulates the fixed insert args (full-precision quantity + per-unit macros).
  const applyNewTransform = (raw: Item): Item => ({
    ...raw,
    quantity: sanitizeQuantity(raw.quantity),
    protein: sanitizeExactMacro(raw.protein),
    carbs: sanitizeExactMacro(raw.carbs),
    fats: sanitizeExactMacro(raw.fats),
    calories: sanitizeExactMacro(raw.calories),
  });

  // Mirrors popularFoods.ts Chicken Breast at a realistic multi-serving quantity.
  const rawItem = item({ quantity: 2, protein: 29.55, carbs: 0, fats: 7.72, calories: 195 });

  test('OLD transform (sanitizeMacro on quantity AND macros) diverges from the raw total', () => {
    const rawTotal = sumItems([rawItem]);
    // A reload + no-op Save (applyEdits -> sumItems) of the persisted item.
    const resavedTotal = sumItems([applyOldTransform(rawItem)]);
    // protein 29.55 -> sanitizeMacro -> 29.6; 29.6 * 2 = 59.2, not the raw 59.1:
    // a no-op Save silently rewrites the total with no user edit.
    expect(resavedTotal).not.toEqual(rawTotal);
    expect(resavedTotal.protein).toBe(59.2);
    expect(rawTotal.protein).toBe(59.1);
  });

  test('NEW transform (sanitizeQuantity + sanitizeExactMacro) reconciles exactly', () => {
    const rawTotal = sumItems([rawItem]);
    const resavedTotal = sumItems([applyNewTransform(rawItem)]);
    expect(resavedTotal).toEqual(rawTotal);
  });

  test('also reconciles for a fractional quantity (0.25 servings)', () => {
    const fractionalItem = item({ quantity: 0.25, protein: 29.55, carbs: 0, fats: 7.72, calories: 195 });
    const rawTotal = sumItems([fractionalItem]);

    expect(sumItems([applyOldTransform(fractionalItem)])).not.toEqual(rawTotal); // quantity 0.25 -> 0.3 (+20%)
    expect(sumItems([applyNewTransform(fractionalItem)])).toEqual(rawTotal);
  });
});
