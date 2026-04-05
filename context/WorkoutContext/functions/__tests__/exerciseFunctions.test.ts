import { Dispatch, SetStateAction } from 'react';
import { Exercise, Log } from '../../types';
import {
  addExercise,
  archiveExercise,
  deleteExercise,
  incrementExerciseOrders,
  updateExerciseOrder
} from '../exerciseFunctions';

// Helper function to create mock exercise
function createMockExercise(overrides: Partial<Exercise> = {}): Exercise {
    return {
        id: 'test-ex-id',
        userID: 'user-1',
        workoutID: 'workout-1',
        name: 'Test Exercise',
        userMax: 0,
        order: 0,
        archived: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides
    };
}

// Helper function to create mock setter that tracks state
function createMockSetter<T>() {
    let state: T[] = [];
    
    const setter: Dispatch<SetStateAction<T[]>> = (updater) => {
        if (typeof updater === 'function') {
            state = (updater as (prev: T[]) => T[])(state);
        } else {
            state = updater;
        }
    };
    
    const getState = () => [...state];
    const setState = (newState: T[]) => { state = [...newState]; };
    
    return { setter, getState, setState };
}

describe('Exercise Functions', () => {
    
    describe('incrementExerciseOrders', () => {
        
        describe('Normal Cases', () => {
            test('should increment order of exercises in specific workout', () => {
                const exercises = [
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-2', order: 0 })
                ];
                
                const result = incrementExerciseOrders(exercises, 'workout-1');
                
                expect(result[0].order).toBe(1);
                expect(result[1].order).toBe(2);
                expect(result[2].order).toBe(0); // Different workout, unchanged
            });
            
            test('should not affect exercises from other workouts', () => {
                const exercises = [
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-2', order: 5 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-1', order: 1 })
                ];
                
                const result = incrementExerciseOrders(exercises, 'workout-1');
                
                expect(result[0].order).toBe(1);
                expect(result[1].order).toBe(5); // workout-2 unchanged
                expect(result[2].order).toBe(2);
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle empty array', () => {
                const result = incrementExerciseOrders([], 'workout-1');
                expect(result).toEqual([]);
            });
            
            test('should handle workout with no exercises', () => {
                const exercises = [
                    createMockExercise({ id: 'ex1', workoutID: 'workout-2', order: 0 })
                ];
                
                const result = incrementExerciseOrders(exercises, 'workout-1');
                expect(result[0].order).toBe(0);
            });
        });
    });
    
    describe('addExercise', () => {
        
        describe('Normal Cases', () => {
            test('should add new exercise with order 0', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([]);
                
                addExercise('workout-1', 'user-1', 'New Exercise', setter);
                
                const result = getState();
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('New Exercise');
                expect(result[0].order).toBe(0);
                expect(result[0].workoutID).toBe('workout-1');
                expect(result[0].userID).toBe('user-1');
                expect(result[0].archived).toBe(false);
                expect(result[0].userMax).toBe(0);
            });
            
            test('should increment existing exercises in same workout', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 })
                ]);
                
                addExercise('workout-1', 'user-1', 'New Exercise', setter);
                
                const result = getState();
                expect(result).toHaveLength(3);
                expect(result[0].order).toBe(1);
                expect(result[1].order).toBe(2);
                expect(result[2].order).toBe(0);
            });
            
            test('should not affect exercises in other workouts', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-2', order: 5 })
                ]);
                
                addExercise('workout-1', 'user-1', 'New Exercise', setter);
                
                const result = getState();
                expect(result[0].order).toBe(1); // workout-1 incremented
                expect(result[1].order).toBe(5); // workout-2 unchanged
                expect(result[2].order).toBe(0); // new exercise
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle empty name', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([]);
                
                addExercise('workout-1', 'user-1', '', setter);
                
                const result = getState();
                expect(result[0].name).toBe('');
            });
        });
        
        describe('Property Validation', () => {
            test('should set all required properties when adding exercise', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([]);
                
                addExercise('workout-1', 'user-1', 'Test Exercise', setter);
                
                const result = getState();
                expect(result[0].id).toBeDefined();
                expect(result[0].id).not.toBe('');
                expect(result[0].userID).toBe('user-1');
                expect(result[0].workoutID).toBe('workout-1');
                expect(result[0].name).toBe('Test Exercise');
                expect(result[0].userMax).toBe(0);
                expect(result[0].order).toBe(0);
                expect(result[0].archived).toBe(false);
                expect(result[0].createdAt).toBeInstanceOf(Date);
                expect(result[0].updatedAt).toBeInstanceOf(Date);
            });
            
            test('should generate unique IDs for multiple exercises', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([]);
                
                addExercise('workout-1', 'user-1', 'Exercise 1', setter);
                addExercise('workout-1', 'user-1', 'Exercise 2', setter);
                addExercise('workout-1', 'user-1', 'Exercise 3', setter);
                
                const result = getState();
                const ids = result.map(e => e.id);
                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(3);
            });
        });
    });
    
    describe('deleteExercise', () => {
        
        describe('Normal Cases', () => {
            test('should delete exercise by id', () => {
                const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
                const { setter: setLogs } = createMockSetter<Log>();
                
                setExercisesState([
                    createMockExercise({ id: 'ex1' }),
                    createMockExercise({ id: 'ex2' }),
                    createMockExercise({ id: 'ex3' })
                ]);
                
                deleteExercise('ex2', setExercises, setLogs);
                
                const result = getExercises();
                expect(result).toHaveLength(2);
                expect(result.find(e => e.id === 'ex2')).toBeUndefined();
            });
            
            test('should delete all logs for deleted exercise', () => {
                const { setter: setExercises } = createMockSetter<Exercise>();
                const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
                
                setLogsState([
                    { id: 'log1', workoutID: 'w1', exerciseID: 'ex1', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                    { id: 'log2', workoutID: 'w1', exerciseID: 'ex2', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                    { id: 'log3', workoutID: 'w1', exerciseID: 'ex1', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() }
                ]);
                
                deleteExercise('ex1', setExercises, setLogs);
                
                const result = getLogs();
                expect(result).toHaveLength(1);
                expect(result[0].exerciseID).toBe('ex2');
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle deleting non-existent exercise', () => {
                const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
                const { setter: setLogs } = createMockSetter<Log>();
                
                setExercisesState([createMockExercise({ id: 'ex1' })]);
                
                deleteExercise('non-existent', setExercises, setLogs);
                
                const result = getExercises();
                expect(result).toHaveLength(1);
            });
            
            test('should handle deleting from empty array', () => {
                const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
                const { setter: setLogs } = createMockSetter<Log>();
                
                setExercisesState([]);
                
                deleteExercise('ex1', setExercises, setLogs);
                
                const result = getExercises();
                expect(result).toHaveLength(0);
            });
        });
    });
    
    describe('archiveExercise', () => {
        
        describe('Normal Cases', () => {
            test('should archive an exercise', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([createMockExercise({ id: 'ex1', archived: false })]);
                
                archiveExercise('ex1', 'workout-1', false, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(true);
            });
            
            test('should unarchive exercise and set order to 0', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', archived: true, order: 5 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', archived: false, order: 0 })
                ]);
                
                archiveExercise('ex1', 'workout-1', true, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(false);
                expect(result[0].order).toBe(0);
                expect(result[1].order).toBe(1);
            });
            
            test('should increment other exercises in same workout when unarchiving', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', archived: true, order: 10 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', archived: false, order: 0 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-1', archived: false, order: 1 }),
                    createMockExercise({ id: 'ex4', workoutID: 'workout-2', archived: false, order: 0 })
                ]);
                
                archiveExercise('ex1', 'workout-1', true, setter);
                
                const result = getState();
                expect(result[0].order).toBe(0);
                expect(result[1].order).toBe(1);
                expect(result[2].order).toBe(2);
                expect(result[3].order).toBe(0); // Different workout, unchanged
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle archiving non-existent exercise', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([createMockExercise({ id: 'ex1' })]);
                
                archiveExercise('non-existent', 'workout-1', false, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(false);
            });
            
            test('should handle archiving already archived exercise', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([createMockExercise({ id: 'ex1', archived: true })]);
                
                archiveExercise('ex1', 'workout-1', true, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(false);
            });
            
            test('should handle unarchiving non-archived exercise', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([createMockExercise({ id: 'ex1', archived: false, order: 5 })]);
                
                archiveExercise('ex1', 'workout-1', false, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(true);
            });
            
            test('should update timestamp when archiving', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                const oldDate = new Date('2024-01-01');
                setState([createMockExercise({ id: 'ex1', archived: false, updatedAt: oldDate })]);
                
                archiveExercise('ex1', 'workout-1', false, setter);
                
                const result = getState();
                expect(result[0].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
            });
        });
    });
    
    describe('updateExerciseOrder', () => {
        
        describe('Normal Cases', () => {
            test('should update orders based on new array order', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-1', order: 2 })
                ]);
                
                const reordered = [
                    createMockExercise({ id: 'ex3', workoutID: 'workout-1', order: 2 }),
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 })
                ];
                
                updateExerciseOrder('workout-1', reordered, setter);
                
                const result = getState();
                expect(result.find(e => e.id === 'ex3')?.order).toBe(0);
                expect(result.find(e => e.id === 'ex1')?.order).toBe(1);
                expect(result.find(e => e.id === 'ex2')?.order).toBe(2);
            });
            
            test('should not affect exercises from other workouts', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-2', order: 5 })
                ]);
                
                const reordered = [
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 })
                ];
                
                updateExerciseOrder('workout-1', reordered, setter);
                
                const result = getState();
                expect(result.find(e => e.id === 'ex1')?.order).toBe(1);
                expect(result.find(e => e.id === 'ex2')?.order).toBe(0);
                expect(result.find(e => e.id === 'ex3')?.order).toBe(5);
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle empty reordered array', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 })]);
                
                updateExerciseOrder('workout-1', [], setter);
                
                const result = getState();
                expect(result[0].order).toBe(0);
            });
            
            test('should handle reordered array with exercise not in current state', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 })
                ]);
                
                const reordered = [
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-1', order: 1 }) // Not in current state
                ];
                
                updateExerciseOrder('workout-1', reordered, setter);
                
                const result = getState();
                expect(result.find(e => e.id === 'ex1')?.order).toBe(0);
                expect(result.find(e => e.id === 'ex2')?.order).toBe(1); // Unchanged
                expect(result.find(e => e.id === 'ex3')).toBeUndefined(); // Not added
            });
            
            test('should handle partial reordering', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-1', order: 2 }),
                    createMockExercise({ id: 'ex4', workoutID: 'workout-1', order: 3 })
                ]);
                
                const reordered = [
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 })
                ];
                
                updateExerciseOrder('workout-1', reordered, setter);
                
                const result = getState();
                expect(result.find(e => e.id === 'ex1')?.order).toBe(1);
                expect(result.find(e => e.id === 'ex2')?.order).toBe(0);
                expect(result.find(e => e.id === 'ex3')?.order).toBe(2); // Unchanged
                expect(result.find(e => e.id === 'ex4')?.order).toBe(3); // Unchanged
            });
            
            test('should handle reordered array with exercises from different workouts', () => {
                const { setter, getState, setState } = createMockSetter<Exercise>();
                setState([
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-2', order: 0 })
                ]);
                
                const reordered = [
                    createMockExercise({ id: 'ex2', workoutID: 'workout-1', order: 1 }),
                    createMockExercise({ id: 'ex1', workoutID: 'workout-1', order: 0 }),
                    createMockExercise({ id: 'ex3', workoutID: 'workout-2', order: 0 }) // Different workout
                ];
                
                updateExerciseOrder('workout-1', reordered, setter);
                
                const result = getState();
                expect(result.find(e => e.id === 'ex1')?.order).toBe(1);
                expect(result.find(e => e.id === 'ex2')?.order).toBe(0);
                expect(result.find(e => e.id === 'ex3')?.order).toBe(0); // workout-2 unchanged
            });
        });
    });
    
    describe('Challenging Cases', () => {
        test('should handle adding multiple exercises to same workout', () => {
            const { setter, getState, setState } = createMockSetter<Exercise>();
            setState([]);
            
            addExercise('workout-1', 'user-1', 'Exercise 1', setter);
            addExercise('workout-1', 'user-1', 'Exercise 2', setter);
            addExercise('workout-1', 'user-1', 'Exercise 3', setter);
            
            const result = getState();
            expect(result).toHaveLength(3);
            expect(result[0].order).toBe(2);
            expect(result[1].order).toBe(1);
            expect(result[2].order).toBe(0);
        });
        
        test('should handle exercises across multiple workouts', () => {
            const { setter, getState, setState } = createMockSetter<Exercise>();
            setState([]);
            
            addExercise('workout-1', 'user-1', 'Ex1', setter);
            addExercise('workout-2', 'user-1', 'Ex2', setter);
            addExercise('workout-1', 'user-1', 'Ex3', setter);
            
            const result = getState();
            expect(result).toHaveLength(3);
            expect(result[0].order).toBe(1); // workout-1 incremented
            expect(result[1].order).toBe(0); // workout-2 new
            expect(result[2].order).toBe(0); // workout-1 new
        });
        
        test('should handle complex delete with logs', () => {
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            setExercisesState([
                createMockExercise({ id: 'ex1', workoutID: 'workout-1' }),
                createMockExercise({ id: 'ex2', workoutID: 'workout-1' }),
                createMockExercise({ id: 'ex3', workoutID: 'workout-2' })
            ]);
            
            setLogsState([
                { id: 'log1', workoutID: 'workout-1', exerciseID: 'ex1', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                { id: 'log2', workoutID: 'workout-1', exerciseID: 'ex1', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                { id: 'log3', workoutID: 'workout-1', exerciseID: 'ex2', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() }
            ]);
            
            deleteExercise('ex1', setExercises, setLogs);
            
            const exercises = getExercises();
            const logs = getLogs();
            
            expect(exercises).toHaveLength(2);
            expect(logs).toHaveLength(1);
            expect(logs[0].exerciseID).toBe('ex2');
        });
        
        test('should handle unarchiving with many active exercises in workout', () => {
            const { setter, getState, setState } = createMockSetter<Exercise>();
            const activeExercises = Array.from({ length: 50 }, (_, i) => 
                createMockExercise({ id: `active-${i}`, workoutID: 'workout-1', archived: false, order: i })
            );
            setState([
                createMockExercise({ id: 'archived-1', workoutID: 'workout-1', archived: true, order: 100 }),
                ...activeExercises
            ]);
            
            archiveExercise('archived-1', 'workout-1', true, setter);
            
            const result = getState();
            const unarchived = result.find(e => e.id === 'archived-1');
            expect(unarchived?.archived).toBe(false);
            expect(unarchived?.order).toBe(0);
            // All active exercises in same workout should be incremented
            expect(result.find(e => e.id === 'active-0')?.order).toBe(1);
            expect(result.find(e => e.id === 'active-49')?.order).toBe(50);
        });
    });
});
