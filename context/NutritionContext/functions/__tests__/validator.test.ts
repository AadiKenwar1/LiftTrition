import { nutritionEntryError, validateNutritionEntry } from '../validator';

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

describe('Nutrition Validator', () => {
  beforeEach(() => {
    mockAlert.mockClear();
  });

  describe('validateNutritionEntry', () => {
    test('should return true for a valid entry', () => {
      expect(validateNutritionEntry({ protein: 30, carbs: 40, fats: 10, calories: 370 })).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return true when fields are undefined', () => {
      expect(validateNutritionEntry({})).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return false for negative values', () => {
      expect(validateNutritionEntry({ protein: -1 })).toBe(false);
      expect(validateNutritionEntry({ carbs: -1 })).toBe(false);
      expect(validateNutritionEntry({ fats: -1 })).toBe(false);
      expect(validateNutritionEntry({ calories: -1 })).toBe(false);
    });

    test('should return false for NaN values', () => {
      expect(validateNutritionEntry({ protein: NaN })).toBe(false);
      expect(validateNutritionEntry({ carbs: NaN })).toBe(false);
      expect(validateNutritionEntry({ fats: NaN })).toBe(false);
      expect(validateNutritionEntry({ calories: NaN })).toBe(false);
    });

    test('should return false for non-finite values', () => {
      expect(validateNutritionEntry({ calories: Infinity })).toBe(false);
      expect(validateNutritionEntry({ protein: -Infinity })).toBe(false);
    });

    test('should return true for zero values', () => {
      expect(validateNutritionEntry({ protein: 0, carbs: 0, fats: 0, calories: 0 })).toBe(true);
    });
  });

  describe('nutritionEntryError (pure, no alert)', () => {
    test('returns null for a valid entry and never alerts', () => {
      expect(nutritionEntryError({ protein: 30, carbs: 40, fats: 10, calories: 370 })).toBeNull();
      expect(nutritionEntryError({ protein: -1 })).not.toBeNull();
      expect(nutritionEntryError({ calories: NaN })).not.toBeNull();
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });
});
