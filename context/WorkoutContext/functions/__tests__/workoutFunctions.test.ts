import { Dispatch, SetStateAction } from 'react';
import { Exercise, Log, Workout } from '../../types';
import {
  addWorkout,
  archiveWorkout,
  deleteWorkout,
  incrementWorkoutOrders,
  renameWorkout,
  updateWorkoutNote,
  updateWorkoutOrder
} from '../workoutFunctions';

// Helper function to create mock workout
function createMockWorkout(overrides: Partial<Workout> = {}): Workout {
    return {
        id: 'test-id',
        userID: 'user-1',
        name: 'Test Workout',
        order: 0,
        archived: false,
        note: '',
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

describe('Workout Functions', () => {
    
    describe('incrementWorkoutOrders', () => {
        
        describe('Normal Cases', () => {
            test('should increment order of all workouts by 1', () => {
                const workouts = [
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '2', order: 1 }),
                    createMockWorkout({ id: '3', order: 2 })
                ];
                
                const result = incrementWorkoutOrders(workouts);
                
                expect(result[0].order).toBe(1);
                expect(result[1].order).toBe(2);
                expect(result[2].order).toBe(3);
            });
            
            test('should update updatedAt timestamp for all workouts', () => {
                const oldDate = new Date('2024-01-01');
                const workouts = [
                    createMockWorkout({ id: '1', order: 0, updatedAt: oldDate }),
                    createMockWorkout({ id: '2', order: 1, updatedAt: oldDate })
                ];
                
                const result = incrementWorkoutOrders(workouts);
                const newDate = new Date();
                
                expect(result[0].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
                expect(result[1].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle empty array', () => {
                const result = incrementWorkoutOrders([]);
                expect(result).toEqual([]);
            });
            
            test('should handle single workout', () => {
                const workouts = [createMockWorkout({ id: '1', order: 5 })];
                const result = incrementWorkoutOrders(workouts);
                
                expect(result[0].order).toBe(6);
            });
            
            test('should handle negative orders', () => {
                const workouts = [createMockWorkout({ id: '1', order: -5 })];
                const result = incrementWorkoutOrders(workouts);

                expect(result[0].order).toBe(-4);
            });
        });

        test('does not bump archived workouts', () => {
            const result = incrementWorkoutOrders([
                createMockWorkout({ id: 'a', order: 0, archived: false }),
                createMockWorkout({ id: 'b', order: 3, archived: true }),
            ]);
            expect(result[0].order).toBe(1);
            expect(result[1].order).toBe(3);
        });
    });

    describe('addWorkout', () => {
        
        describe('Normal Cases', () => {
            test('should add new workout with order 0', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([]);
                
                addWorkout('New Workout', 'user-1', setter);
                
                const result = getState();
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('New Workout');
                expect(result[0].order).toBe(0);
                expect(result[0].userID).toBe('user-1');
                expect(result[0].archived).toBe(false);
                expect(result[0].note).toBe('');
            });
            
            test('should increment existing workouts when adding new one', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '2', order: 1 })
                ]);
                
                addWorkout('New Workout', 'user-1', setter);
                
                const result = getState();
                expect(result).toHaveLength(3);
                expect(result[0].order).toBe(1); // First workout incremented
                expect(result[1].order).toBe(2); // Second workout incremented
                expect(result[2].order).toBe(0); // New workout at order 0
            });
            
            test('should generate unique id for new workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([]);
                
                addWorkout('Workout 1', 'user-1', setter);
                addWorkout('Workout 2', 'user-1', setter);
                
                const result = getState();
                expect(result[0].id).not.toBe(result[1].id);
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle empty name', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([]);
                
                addWorkout('', 'user-1', setter);
                
                const result = getState();
                expect(result[0].name).toBe('');
            });
            
            test('should handle very long name', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([]);
                const longName = 'A'.repeat(1000);
                
                addWorkout(longName, 'user-1', setter);
                
                const result = getState();
                expect(result[0].name).toBe(longName);
            });
        });
        
        describe('Property Validation', () => {
            test('should set all required properties when adding workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([]);
                
                addWorkout('Test Workout', 'user-1', setter);
                
                const result = getState();
                expect(result[0].id).toBeDefined();
                expect(result[0].id).not.toBe('');
                expect(result[0].userID).toBe('user-1');
                expect(result[0].name).toBe('Test Workout');
                expect(result[0].order).toBe(0);
                expect(result[0].archived).toBe(false);
                expect(result[0].note).toBe('');
                expect(result[0].createdAt).toBeInstanceOf(Date);
                expect(result[0].updatedAt).toBeInstanceOf(Date);
            });
            
            test('should generate unique IDs for multiple workouts', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([]);
                
                addWorkout('Workout 1', 'user-1', setter);
                addWorkout('Workout 2', 'user-1', setter);
                addWorkout('Workout 3', 'user-1', setter);
                
                const result = getState();
                const ids = result.map(w => w.id);
                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(3);
            });
        });

        test('does not bump archived workouts when inserting', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            setState([
                createMockWorkout({ id: '1', order: 0, archived: false }),
                createMockWorkout({ id: '2', order: 5, archived: true }),
            ]);

            addWorkout('New Workout', 'user-1', setter);

            const result = getState();
            expect(result.find(w => w.id === '1')?.order).toBe(1);
            expect(result.find(w => w.id === '2')?.order).toBe(5);
        });
    });

    describe('deleteWorkout', () => {
        
        describe('Normal Cases', () => {
            test('should delete workout by id', () => {
                const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
                const { setter: setExercises } = createMockSetter<Exercise>();
                const { setter: setLogs } = createMockSetter<Log>();
                
                setWorkoutsState([
                    createMockWorkout({ id: '1' }),
                    createMockWorkout({ id: '2' }),
                    createMockWorkout({ id: '3' })
                ]);
                
                deleteWorkout('2', setWorkouts, setExercises, setLogs);
                
                const result = getWorkouts();
                expect(result).toHaveLength(2);
                expect(result.find(w => w.id === '2')).toBeUndefined();
            });
            
            test('should delete all exercises for deleted workout', () => {
                const { setter: setWorkouts } = createMockSetter<Workout>();
                const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
                const { setter: setLogs } = createMockSetter<Log>();
                
                setExercisesState([
                    { id: 'ex1', workoutID: '1', userID: 'user-1', name: 'Exercise 1', userMax: 0, order: 0, archived: false, createdAt: new Date(), updatedAt: new Date() },
                    { id: 'ex2', workoutID: '2', userID: 'user-1', name: 'Exercise 2', userMax: 0, order: 0, archived: false, createdAt: new Date(), updatedAt: new Date() },
                    { id: 'ex3', workoutID: '1', userID: 'user-1', name: 'Exercise 3', userMax: 0, order: 0, archived: false, createdAt: new Date(), updatedAt: new Date() }
                ]);
                
                deleteWorkout('1', setWorkouts, setExercises, setLogs);
                
                const result = getExercises();
                expect(result).toHaveLength(1);
                expect(result[0].id).toBe('ex2');
            });
            
            test('should delete all logs for deleted workout', () => {
                const { setter: setWorkouts } = createMockSetter<Workout>();
                const { setter: setExercises } = createMockSetter<Exercise>();
                const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
                
                setLogsState([
                    { id: 'log1', workoutID: '1', exerciseID: 'ex1', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                    { id: 'log2', workoutID: '2', exerciseID: 'ex2', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                    { id: 'log3', workoutID: '1', exerciseID: 'ex3', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() }
                ]);
                
                deleteWorkout('1', setWorkouts, setExercises, setLogs);
                
                const result = getLogs();
                expect(result).toHaveLength(1);
                expect(result[0].id).toBe('log2');
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle deleting non-existent workout', () => {
                const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
                const { setter: setExercises } = createMockSetter<Exercise>();
                const { setter: setLogs } = createMockSetter<Log>();
                
                setWorkoutsState([createMockWorkout({ id: '1' })]);
                
                deleteWorkout('non-existent', setWorkouts, setExercises, setLogs);
                
                const result = getWorkouts();
                expect(result).toHaveLength(1);
            });
            
            test('should handle deleting from empty array', () => {
                const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
                const { setter: setExercises } = createMockSetter<Exercise>();
                const { setter: setLogs } = createMockSetter<Log>();
                
                setWorkoutsState([]);
                
                deleteWorkout('1', setWorkouts, setExercises, setLogs);
                
                const result = getWorkouts();
                expect(result).toHaveLength(0);
            });
        });
    });
    
    describe('archiveWorkout', () => {
        
        describe('Normal Cases', () => {
            test('should archive a workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', archived: false })]);
                
                archiveWorkout('1', false, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(true);
            });
            
            test('should unarchive a workout and set order to 0', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([
                    createMockWorkout({ id: '1', archived: true, order: 5 }),
                    createMockWorkout({ id: '2', archived: false, order: 0 })
                ]);
                
                archiveWorkout('1', true, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(false);
                expect(result[0].order).toBe(0);
                expect(result[1].order).toBe(1); // Other workout incremented
            });
            
            test('should increment other workouts when unarchiving', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([
                    createMockWorkout({ id: '1', archived: true, order: 10 }),
                    createMockWorkout({ id: '2', archived: false, order: 0 }),
                    createMockWorkout({ id: '3', archived: false, order: 1 })
                ]);
                
                archiveWorkout('1', true, setter);
                
                const result = getState();
                expect(result[0].order).toBe(0);
                expect(result[1].order).toBe(1);
                expect(result[2].order).toBe(2);
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle archiving non-existent workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1' })]);
                
                archiveWorkout('non-existent', false, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(false);
            });
            
            test('should handle archiving already archived workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', archived: true })]);
                
                archiveWorkout('1', true, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(false);
            });
            
            test('should handle unarchiving non-archived workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', archived: false, order: 5 })]);
                
                archiveWorkout('1', false, setter);
                
                const result = getState();
                expect(result[0].archived).toBe(true);
            });
            
            test('should update timestamp when archiving', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                const oldDate = new Date('2024-01-01');
                setState([createMockWorkout({ id: '1', archived: false, updatedAt: oldDate })]);
                
                archiveWorkout('1', false, setter);

                const result = getState();
                expect(result[0].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
            });
        });

        test('unarchiving bumps only active siblings, archived rows keep their order', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            setState([
                createMockWorkout({ id: '1', archived: true, order: 10 }),
                createMockWorkout({ id: '2', archived: false, order: 0 }),
                createMockWorkout({ id: '3', archived: true, order: 5 }),
            ]);

            archiveWorkout('1', true, setter);

            const result = getState();
            expect(result.find(w => w.id === '1')).toMatchObject({ archived: false, order: 0 });
            expect(result.find(w => w.id === '2')?.order).toBe(1);
            expect(result.find(w => w.id === '3')?.order).toBe(5);
        });

        test('archiving places the target at order 0 and bumps other archived rows only', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            setState([
                createMockWorkout({ id: '1', archived: false, order: 0 }),
                createMockWorkout({ id: '2', archived: true, order: 0 }),
                createMockWorkout({ id: '3', archived: false, order: 1 }),
            ]);

            archiveWorkout('1', false, setter);

            const result = getState();
            expect(result.find(w => w.id === '1')).toMatchObject({ archived: true, order: 0 });
            expect(result.find(w => w.id === '2')?.order).toBe(1);
            expect(result.find(w => w.id === '3')?.order).toBe(1);
        });
    });

    describe('renameWorkout', () => {
        
        describe('Normal Cases', () => {
            test('should rename workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', name: 'Old Name' })]);
                
                renameWorkout('1', 'New Name', setter);
                
                const result = getState();
                expect(result[0].name).toBe('New Name');
            });
            
            test('should update updatedAt timestamp', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                const oldDate = new Date('2024-01-01');
                setState([createMockWorkout({ id: '1', updatedAt: oldDate })]);
                
                renameWorkout('1', 'New Name', setter);
                
                const result = getState();
                expect(result[0].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle renaming non-existent workout', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', name: 'Original' })]);
                
                renameWorkout('non-existent', 'New Name', setter);
                
                const result = getState();
                expect(result[0].name).toBe('Original');
            });
            
            test('should handle empty name', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', name: 'Original' })]);
                
                renameWorkout('1', '', setter);
                
                const result = getState();
                expect(result[0].name).toBe('');
            });
        });
    });
    
    describe('updateWorkoutNote', () => {
        
        describe('Normal Cases', () => {
            test('should update workout note', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', note: 'Old note' })]);
                
                updateWorkoutNote('1', 'New note', setter);
                
                const result = getState();
                expect(result[0].note).toBe('New note');
            });
            
            test('should handle long note', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                const longNote = 'A'.repeat(1000);
                setState([createMockWorkout({ id: '1', note: '' })]);
                
                updateWorkoutNote('1', longNote, setter);
                
                const result = getState();
                expect(result[0].note).toBe(longNote);
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle empty note', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', note: 'Old note' })]);
                
                updateWorkoutNote('1', '', setter);
                
                const result = getState();
                expect(result[0].note).toBe('');
            });
        });
    });
    
    describe('updateWorkoutOrder', () => {
        
        describe('Normal Cases', () => {
            test('should update orders based on new array order', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '2', order: 1 }),
                    createMockWorkout({ id: '3', order: 2 })
                ]);
                
                const reordered = [
                    createMockWorkout({ id: '3', order: 2 }),
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '2', order: 1 })
                ];
                
                updateWorkoutOrder(reordered, setter);
                
                const result = getState();
                expect(result.find(w => w.id === '3')?.order).toBe(0);
                expect(result.find(w => w.id === '1')?.order).toBe(1);
                expect(result.find(w => w.id === '2')?.order).toBe(2);
            });
            
            test('should preserve workouts not in reordered array', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '2', order: 1 }),
                    createMockWorkout({ id: '3', order: 2 })
                ]);
                
                const reordered = [
                    createMockWorkout({ id: '2', order: 1 })
                ];
                
                updateWorkoutOrder(reordered, setter);
                
                const result = getState();
                expect(result.find(w => w.id === '2')?.order).toBe(0);
                expect(result.find(w => w.id === '1')?.order).toBe(0);
                expect(result.find(w => w.id === '3')?.order).toBe(2);
            });
        });
        
        describe('Edge Cases', () => {
            test('should handle empty reordered array', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([createMockWorkout({ id: '1', order: 0 })]);
                
                updateWorkoutOrder([], setter);
                
                const result = getState();
                expect(result[0].order).toBe(0);
            });
            
            test('should handle reordered array with workout not in current state', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '2', order: 1 })
                ]);
                
                const reordered = [
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '3', order: 1 }) // Not in current state
                ];
                
                updateWorkoutOrder(reordered, setter);
                
                const result = getState();
                expect(result.find(w => w.id === '1')?.order).toBe(0);
                expect(result.find(w => w.id === '2')?.order).toBe(1); // Unchanged
                expect(result.find(w => w.id === '3')).toBeUndefined(); // Not added
            });
            
            test('should handle partial reordering', () => {
                const { setter, getState, setState } = createMockSetter<Workout>();
                setState([
                    createMockWorkout({ id: '1', order: 0 }),
                    createMockWorkout({ id: '2', order: 1 }),
                    createMockWorkout({ id: '3', order: 2 }),
                    createMockWorkout({ id: '4', order: 3 })
                ]);
                
                const reordered = [
                    createMockWorkout({ id: '2', order: 1 }),
                    createMockWorkout({ id: '1', order: 0 })
                ];
                
                updateWorkoutOrder(reordered, setter);
                
                const result = getState();
                expect(result.find(w => w.id === '1')?.order).toBe(1);
                expect(result.find(w => w.id === '2')?.order).toBe(0);
                expect(result.find(w => w.id === '3')?.order).toBe(2); // Unchanged
                expect(result.find(w => w.id === '4')?.order).toBe(3); // Unchanged
            });
        });
    });
    
    describe('Challenging Cases', () => {
        test('should handle adding multiple workouts in sequence', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            setState([]);
            
            addWorkout('Workout 1', 'user-1', setter);
            addWorkout('Workout 2', 'user-1', setter);
            addWorkout('Workout 3', 'user-1', setter);
            
            const result = getState();
            expect(result).toHaveLength(3);
            expect(result[0].order).toBe(2);
            expect(result[1].order).toBe(1);
            expect(result[2].order).toBe(0);
        });
        
        test('should maintain order integrity with many workouts', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            const initialWorkouts = Array.from({ length: 10 }, (_, i) => 
                createMockWorkout({ id: `workout-${i}`, order: i })
            );
            setState(initialWorkouts);
            
            addWorkout('New Workout', 'user-1', setter);
            
            const result = getState();
            expect(result).toHaveLength(11);
            expect(result[10].order).toBe(0);
            expect(result[0].order).toBe(1);
            expect(result[9].order).toBe(10);
        });
        
        test('should handle complex delete with exercises and logs', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            setWorkoutsState([
                createMockWorkout({ id: '1' }),
                createMockWorkout({ id: '2' })
            ]);
            
            setExercisesState([
                { id: 'ex1', workoutID: '1', userID: 'user-1', name: 'Ex1', userMax: 0, order: 0, archived: false, createdAt: new Date(), updatedAt: new Date() },
                { id: 'ex2', workoutID: '1', userID: 'user-1', name: 'Ex2', userMax: 0, order: 0, archived: false, createdAt: new Date(), updatedAt: new Date() },
                { id: 'ex3', workoutID: '2', userID: 'user-1', name: 'Ex3', userMax: 0, order: 0, archived: false, createdAt: new Date(), updatedAt: new Date() }
            ]);
            
            setLogsState([
                { id: 'log1', workoutID: '1', exerciseID: 'ex1', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                { id: 'log2', workoutID: '1', exerciseID: 'ex2', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() },
                { id: 'log3', workoutID: '2', exerciseID: 'ex3', userID: 'user-1', date: new Date('2024-01-01'), time: 0, weight: 100, reps: 10, rpe: 8, createdAt: new Date(), updatedAt: new Date() }
            ]);
            
            deleteWorkout('1', setWorkouts, setExercises, setLogs);
            
            const workouts = getWorkouts();
            const exercises = getExercises();
            const logs = getLogs();
            
            expect(workouts).toHaveLength(1);
            expect(exercises).toHaveLength(1);
            expect(logs).toHaveLength(1);
            expect(exercises[0].id).toBe('ex3');
            expect(logs[0].id).toBe('log3');
        });
        
        test('should handle unarchiving with many active workouts', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            const activeWorkouts = Array.from({ length: 50 }, (_, i) => 
                createMockWorkout({ id: `active-${i}`, archived: false, order: i })
            );
            setState([
                createMockWorkout({ id: 'archived-1', archived: true, order: 100 }),
                ...activeWorkouts
            ]);
            
            archiveWorkout('archived-1', true, setter);
            
            const result = getState();
            const unarchived = result.find(w => w.id === 'archived-1');
            expect(unarchived?.archived).toBe(false);
            expect(unarchived?.order).toBe(0);
            // All active workouts should be incremented
            expect(result.find(w => w.id === 'active-0')?.order).toBe(1);
            expect(result.find(w => w.id === 'active-49')?.order).toBe(50);
        });
    });
});
