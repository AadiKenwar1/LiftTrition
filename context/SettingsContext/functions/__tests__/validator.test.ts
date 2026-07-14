import { validateHeightWeight, validateMacro } from '../validator';

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

describe('Settings Validator', () => {
  beforeEach(() => {
    mockAlert.mockClear();
  });

  describe('validateHeightWeight', () => {
    test('should return true for valid imperial values', () => {
      expect(validateHeightWeight(70, 150, 'imperial')).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return true for valid metric values', () => {
      expect(validateHeightWeight(180, 80, 'metric')).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return false for height below minimum', () => {
      expect(validateHeightWeight(10, 150, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalled();
    });

    test('should return false for weight below minimum', () => {
      expect(validateHeightWeight(70, 10, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalled();
    });

    test('should return false for NaN weight', () => {
      expect(validateHeightWeight(70, NaN, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalled();
    });

    test('should return false for NaN height', () => {
      expect(validateHeightWeight(NaN, 150, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalled();
    });

    test('should return false for non-finite values', () => {
      expect(validateHeightWeight(70, Infinity, 'imperial')).toBe(false);
      expect(validateHeightWeight(-Infinity, 80, 'metric')).toBe(false);
    });
  });

  describe('validateMacro', () => {
    test('should return true for valid values', () => {
      expect(validateMacro(150)).toBe(true);
      expect(validateMacro(0)).toBe(true);
    });

    test('should return false for NaN and non-finite values', () => {
      expect(validateMacro(NaN)).toBe(false);
      expect(validateMacro(Infinity)).toBe(false);
    });

    test('should return false for negative values', () => {
      expect(validateMacro(-1)).toBe(false);
    });
  });
});
