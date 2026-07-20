import { validateLog } from '../validator';

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

describe('Workout Validator', () => {
  beforeEach(() => {
    mockAlert.mockClear();
  });

  describe('validateLog', () => {
    test('should return true for valid log', () => {
      expect(validateLog(100, 10, 8)).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return false for negative weight', () => {
      expect(validateLog(-10, 10, 8)).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Invalid Input', 'Weight cannot be negative');
    });

    test('should return false for negative reps', () => {
      expect(validateLog(100, -5, 8)).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Invalid Input', 'Reps cannot be less than 0');
    });

    test('should return false for zero reps', () => {
      expect(validateLog(100, 0, 8)).toBe(false);
    });

    test('should return false for negative RPE', () => {
      expect(validateLog(100, 10, -1)).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Invalid Input', 'RPE cannot be negative');
    });

    test('should return false for RPE > 10', () => {
      expect(validateLog(100, 10, 11)).toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('Invalid Input', 'RPE must be between 0-10');
    });

    test('should return true for RPE 0', () => {
      expect(validateLog(100, 10, 0)).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    test('should return true for RPE 10', () => {
      expect(validateLog(100, 10, 10)).toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });
});
