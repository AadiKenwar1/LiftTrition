import { validateHeight, validateHeightWeight, validateMacro, validateWeight } from '../validator';

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

    // The pair is validateHeight && validateWeight, so height must still be reported first and only one
    // alert may fire — a user fixing two bad fields is told about one at a time, starting at the top.
    test('should report height first and never reach weight when both are invalid', () => {
      expect(validateHeightWeight(10, 10, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalledTimes(1);
      expect(mockAlert.mock.calls[0][1]).toContain('Height');
    });
  });

  // Half of the pair, for screens that collect height without a weight to check it against.
  describe('validateHeight', () => {
    test('should return true for valid imperial and metric values', () => {
      expect(validateHeight(70, 'imperial')).toBe(true);
      expect(validateHeight(180, 'metric')).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should accept the minimum exactly', () => {
      expect(validateHeight(24, 'imperial')).toBe(true);
      expect(validateHeight(60, 'metric')).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return false just below the minimum', () => {
      expect(validateHeight(23, 'imperial')).toBe(false);
      expect(validateHeight(59, 'metric')).toBe(false);
      expect(mockAlert).toHaveBeenCalledTimes(2);
    });

    test('should return false for zero and negative values', () => {
      expect(validateHeight(0, 'imperial')).toBe(false);
      expect(validateHeight(-70, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalled();
    });

    test('should return false for NaN and non-finite values', () => {
      expect(validateHeight(NaN, 'imperial')).toBe(false);
      expect(validateHeight(Infinity, 'metric')).toBe(false);
      expect(validateHeight(-Infinity, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalledTimes(3);
    });

    test('should use the unit-appropriate floor', () => {
      // 30 clears the imperial floor (inches) but not the metric one (cm).
      expect(validateHeight(30, 'imperial')).toBe(true);
      expect(validateHeight(30, 'metric')).toBe(false);
    });
  });

  // The other half, for screens that collect weight before any height exists.
  describe('validateWeight', () => {
    test('should return true for valid imperial and metric values', () => {
      expect(validateWeight(150, 'imperial')).toBe(true);
      expect(validateWeight(80, 'metric')).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should accept the minimum exactly', () => {
      expect(validateWeight(50, 'imperial')).toBe(true);
      expect(validateWeight(20, 'metric')).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return false just below the minimum', () => {
      expect(validateWeight(49, 'imperial')).toBe(false);
      expect(validateWeight(19, 'metric')).toBe(false);
      expect(mockAlert).toHaveBeenCalledTimes(2);
    });

    test('should return false for zero and negative values', () => {
      expect(validateWeight(0, 'imperial')).toBe(false);
      expect(validateWeight(-150, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalled();
    });

    test('should return false for NaN and non-finite values', () => {
      expect(validateWeight(NaN, 'imperial')).toBe(false);
      expect(validateWeight(Infinity, 'metric')).toBe(false);
      expect(validateWeight(-Infinity, 'imperial')).toBe(false);
      expect(mockAlert).toHaveBeenCalledTimes(3);
    });

    test('should use the unit-appropriate floor', () => {
      // 30 clears the metric floor (kg) but not the imperial one (lbs).
      expect(validateWeight(30, 'metric')).toBe(true);
      expect(validateWeight(30, 'imperial')).toBe(false);
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
