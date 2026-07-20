import {
  groupAllExerciseLogsByDate,
  getOneRepMaxData,
} from '../graphFunctions';
import { Exercise, Log } from '../../types';
import { getDateKey } from '@/lib/utils/dateHelper';

function createMockLog(overrides: Partial<Log> = {}): Log {
  return {
    id: 'log-1',
    userID: 'user-1',
    workoutID: 'workout-1',
    exerciseID: 'exercise-1',
    date: new Date('2024-01-15'),
    time: 0,
    weight: 100,
    reps: 10,
    rpe: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'exercise-1',
    userID: 'user-1',
    workoutID: 'workout-1',
    name: 'Bench Press',
    userMax: 0,
    order: 0,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Workout Graph Functions', () => {
  describe('groupAllExerciseLogsByDate', () => {
    test('should group logs by date for single exercise', () => {
      const logs: Log[] = [
        createMockLog({ date: new Date('2024-01-15'), exerciseID: 'ex1' }),
        createMockLog({ date: new Date('2024-01-15'), exerciseID: 'ex1', id: 'log2' }),
        createMockLog({ date: new Date('2024-01-16'), exerciseID: 'ex1', id: 'log3' }),
      ];
      const exercises: Exercise[] = [
        createMockExercise({ id: 'ex1', name: 'Bench Press' }),
      ];

      const result = groupAllExerciseLogsByDate('Bench Press', exercises, logs);

      expect(result.length).toBe(2); // 2 unique dates
      const jan15 = result.find(([date]) => date === getDateKey(new Date('2024-01-15')));
      const jan16 = result.find(([date]) => date === getDateKey(new Date('2024-01-16')));
      expect(jan15?.[1].length).toBe(2);
      expect(jan16?.[1].length).toBe(1);
    });

    test('should group same-calendar-day logs regardless of time ordering field', () => {
      const sameDay = new Date('2024-01-15');
      const logs: Log[] = [
        createMockLog({
          date: sameDay,
          exerciseID: 'ex1',
          id: 'early',
          time: 100,
          weight: 90,
          reps: 10,
        }),
        createMockLog({
          date: sameDay,
          exerciseID: 'ex1',
          id: 'late',
          time: 9_000,
          weight: 100,
          reps: 10,
        }),
      ];
      const exercises: Exercise[] = [createMockExercise({ id: 'ex1', name: 'Bench Press' })];

      const result = groupAllExerciseLogsByDate('Bench Press', exercises, logs);

      const bucket = result.find(([d]) => d === getDateKey(sameDay));
      expect(bucket?.[1]).toHaveLength(2);
      expect(bucket?.[1].map((l) => l.id).sort()).toEqual(['early', 'late']);
    });

    test('should return empty array when no matching logs', () => {
      const logs: Log[] = [
        createMockLog({ exerciseID: 'other' }),
      ];
      const exercises: Exercise[] = [
        createMockExercise({ id: 'ex1', name: 'Bench Press' }),
      ];

      const result = groupAllExerciseLogsByDate('Bench Press', exercises, logs);

      expect(result).toEqual([]);
    });

    test('should stop at 21 dates', () => {
      const exercises: Exercise[] = [createMockExercise({ id: 'ex1', name: 'Bench Press' })];
      const logs: Log[] = [];
      for (let i = 0; i < 25; i++) {
        const d = new Date('2024-01-01');
        d.setDate(d.getDate() + i);
        logs.push(createMockLog({ date: d, exerciseID: 'ex1', id: `log-${i}` }));
      }

      const result = groupAllExerciseLogsByDate('Bench Press', exercises, logs);

      expect(result.length).toBe(21);
    });
  });

  describe('getOneRepMaxData', () => {
    test('should return graph data with day and value', () => {
      const logs: Log[] = [
        createMockLog({ date: new Date('2024-01-15'), weight: 100, reps: 10, exerciseID: 'ex1' }),
      ];
      const exercises: Exercise[] = [
        createMockExercise({ id: 'ex1', name: 'Bench Press' }),
      ];

      const result = getOneRepMaxData('Bench Press', exercises, logs);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('day');
      expect(result[0]).toHaveProperty('value');
      expect(typeof result[0].day).toBe('string');
      expect(typeof result[0].value).toBe('number');
      expect(result[0].value).toBeGreaterThan(100); // 1RM > weight for 10 reps
    });

    test('should use highest 1RM per date when multiple sets', () => {
      const sameDate = new Date('2024-01-15');
      const logs: Log[] = [
        createMockLog({ date: sameDate, weight: 100, reps: 10, exerciseID: 'ex1', id: 'l1' }),
        createMockLog({ date: sameDate, weight: 120, reps: 5, exerciseID: 'ex1', id: 'l2' }),
      ];
      const exercises: Exercise[] = [
        createMockExercise({ id: 'ex1', name: 'Bench Press' }),
      ];

      const result = getOneRepMaxData('Bench Press', exercises, logs);

      expect(result.length).toBe(1);
      // 120x5 has higher 1RM than 100x10
      expect(result[0].value).toBeGreaterThan(120);
    });

    test('should return empty array when no logs', () => {
      const result = getOneRepMaxData('Bench Press', [], []);
      expect(result).toEqual([]);
    });
  });
});
