import { Dispatch, SetStateAction } from 'react';
import { Exercise, Log, Workout } from '../../types';
import { addExercise, deleteExercise } from '../exerciseFunctions';
import { addLog } from '../logFunctions';
import { addWorkout, deleteWorkout } from '../workoutFunctions';

// Helper function to create mock workout
function createMockWorkout(overrides: Partial<Workout> = {}): Workout {
    return {
        id: 'workout-1',
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

// Helper function to create mock exercise
function createMockExercise(overrides: Partial<Exercise> = {}): Exercise {
    return {
        id: 'exercise-1',
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

// Helper function to create mock log
function createMockLog(overrides: Partial<Log> = {}): Log {
    return {
        id: 'log-1',
        userID: 'user-1',
        workoutID: 'workout-1',
        exerciseID: 'exercise-1',
        date: new Date('2024-01-01'),
        weight: 100,
        reps: 10,
        rpe: 8,
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

describe('Flow of Layers - Workout, Exercise, and Log Integration', () => {
    
    describe('Normal Cases', () => {
        test('should create complete workout flow: workout -> exercise -> log', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            // Start with empty state
            setWorkoutsState([]);
            setExercisesState([]);
            setLogsState([]);
            
            // Step 1: Add workout
            addWorkout('Push Day', 'user-1', setWorkouts);
            const workouts = getWorkouts();
            expect(workouts).toHaveLength(1);
            const workoutId = workouts[0].id;
            
            // Step 2: Add exercise to workout
            addExercise(workoutId, 'user-1', 'Bench Press', setExercises);
            const exercises = getExercises();
            expect(exercises).toHaveLength(1);
            const exerciseId = exercises[0].id;
            
            // Step 3: Add log to exercise
            addLog(workoutId, exerciseId, 'user-1', 225, 5, 8, new Date(), setLogs);
            const logs = getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].workoutID).toBe(workoutId);
            expect(logs[0].exerciseID).toBe(exerciseId);
        });
        
        test('should handle multiple exercises in one workout', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, setState: setLogsState } = createMockSetter<Log>();
            
            setWorkoutsState([]);
            setExercisesState([]);
            setLogsState([]);
            
            addWorkout('Push Day', 'user-1', setWorkouts);
            const workoutId = getWorkouts()[0].id;
            
            addExercise(workoutId, 'user-1', 'Bench Press', setExercises);
            addExercise(workoutId, 'user-1', 'Shoulder Press', setExercises);
            addExercise(workoutId, 'user-1', 'Tricep Extensions', setExercises);
            
            const exercises = getExercises();
            expect(exercises).toHaveLength(3);
            expect(exercises.every(e => e.workoutID === workoutId)).toBe(true);
        });
        
        test('should handle multiple logs for one exercise', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            setWorkoutsState([]);
            setExercisesState([]);
            setLogsState([]);
            
            addWorkout('Push Day', 'user-1', setWorkouts);
            const workoutId = getWorkouts()[0].id;
            
            addExercise(workoutId, 'user-1', 'Bench Press', setExercises);
            const exerciseId = getExercises()[0].id;
            
            addLog(workoutId, exerciseId, 'user-1', 225, 5, 8, new Date(), setLogs);
            addLog(workoutId, exerciseId, 'user-1', 230, 5, 9, new Date(), setLogs);
            addLog(workoutId, exerciseId, 'user-1', 235, 4, 10, new Date(), setLogs);
            
            const logs = getLogs();
            expect(logs).toHaveLength(3);
            expect(logs.every(l => l.exerciseID === exerciseId)).toBe(true);
        });
    });
    
    describe('Cascading Deletes', () => {
        test('should delete all exercises and logs when workout is deleted', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            // Setup: Create workout with exercises and logs
            setWorkoutsState([createMockWorkout({ id: 'workout-1' })]);
            setExercisesState([
                createMockExercise({ id: 'ex1', workoutID: 'workout-1' }),
                createMockExercise({ id: 'ex2', workoutID: 'workout-1' }),
                createMockExercise({ id: 'ex3', workoutID: 'workout-2' })
            ]);
            setLogsState([
                createMockLog({ id: 'log1', workoutID: 'workout-1', exerciseID: 'ex1' }),
                createMockLog({ id: 'log2', workoutID: 'workout-1', exerciseID: 'ex2' }),
                createMockLog({ id: 'log3', workoutID: 'workout-2', exerciseID: 'ex3' })
            ]);
            
            // Delete workout
            deleteWorkout('workout-1', setWorkouts, setExercises, setLogs);
            
            // Verify cascading delete
            const workouts = getWorkouts();
            const exercises = getExercises();
            const logs = getLogs();
            
            expect(workouts).toHaveLength(0);
            expect(exercises).toHaveLength(1); // Only workout-2 exercise remains
            expect(exercises[0].id).toBe('ex3');
            expect(logs).toHaveLength(1); // Only workout-2 log remains
            expect(logs[0].id).toBe('log3');
        });
        
        test('should delete all logs when exercise is deleted', () => {
            const { setter: setWorkouts } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            // Setup: Create exercise with multiple logs
            setExercisesState([
                createMockExercise({ id: 'ex1', workoutID: 'workout-1' }),
                createMockExercise({ id: 'ex2', workoutID: 'workout-1' })
            ]);
            setLogsState([
                createMockLog({ id: 'log1', exerciseID: 'ex1' }),
                createMockLog({ id: 'log2', exerciseID: 'ex1' }),
                createMockLog({ id: 'log3', exerciseID: 'ex2' })
            ]);
            
            // Delete exercise
            deleteExercise('ex1', setExercises, setLogs);
            
            // Verify cascading delete
            const exercises = getExercises();
            const logs = getLogs();
            
            expect(exercises).toHaveLength(1);
            expect(exercises[0].id).toBe('ex2');
            expect(logs).toHaveLength(1);
            expect(logs[0].id).toBe('log3');
        });
    });
    
    describe('Challenging Cases', () => {
        test('should handle complex workout with multiple exercises and logs', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            setWorkoutsState([]);
            setExercisesState([]);
            setLogsState([]);
            
            // Create workout
            addWorkout('Push Day', 'user-1', setWorkouts);
            const workoutId = getWorkouts()[0].id;
            
            // Add multiple exercises
            addExercise(workoutId, 'user-1', 'Bench Press', setExercises);
            addExercise(workoutId, 'user-1', 'Shoulder Press', setExercises);
            const exercises = getExercises();
            const benchPressId = exercises[0].id;
            const shoulderPressId = exercises[1].id;
            
            // Add logs to each exercise
            addLog(workoutId, benchPressId, 'user-1', 225, 5, 8, new Date(), setLogs);
            addLog(workoutId, benchPressId, 'user-1', 230, 5, 9, new Date(), setLogs);
            addLog(workoutId, shoulderPressId, 'user-1', 135, 8, 7, new Date(), setLogs);
            
            // Verify everything is connected
            const finalWorkouts = getWorkouts();
            const logs = getLogs();
            expect(finalWorkouts).toHaveLength(1);
            expect(exercises).toHaveLength(2);
            expect(logs).toHaveLength(3);
            expect(logs.filter(l => l.exerciseID === benchPressId)).toHaveLength(2);
            expect(logs.filter(l => l.exerciseID === shoulderPressId)).toHaveLength(1);
        });
        
        test('should maintain data integrity when deleting workout with nested data', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            // Create two workouts with data
            setWorkoutsState([
                createMockWorkout({ id: 'workout-1' }),
                createMockWorkout({ id: 'workout-2' })
            ]);
            setExercisesState([
                createMockExercise({ id: 'ex1', workoutID: 'workout-1' }),
                createMockExercise({ id: 'ex2', workoutID: 'workout-1' }),
                createMockExercise({ id: 'ex3', workoutID: 'workout-2' })
            ]);
            setLogsState([
                createMockLog({ id: 'log1', workoutID: 'workout-1', exerciseID: 'ex1' }),
                createMockLog({ id: 'log2', workoutID: 'workout-1', exerciseID: 'ex2' }),
                createMockLog({ id: 'log3', workoutID: 'workout-2', exerciseID: 'ex3' })
            ]);
            
            // Delete first workout
            deleteWorkout('workout-1', setWorkouts, setExercises, setLogs);
            
            // Verify second workout data is intact
            const workouts = getWorkouts();
            const exercises = getExercises();
            const logs = getLogs();
            
            expect(workouts).toHaveLength(1);
            expect(workouts[0].id).toBe('workout-2');
            expect(exercises).toHaveLength(1);
            expect(exercises[0].id).toBe('ex3');
            expect(logs).toHaveLength(1);
            expect(logs[0].id).toBe('log3');
        });
        
        test('should handle multiple workouts with independent exercises and logs', () => {
            const { setter: setWorkouts, getState: getWorkouts, setState: setWorkoutsState } = createMockSetter<Workout>();
            const { setter: setExercises, getState: getExercises, setState: setExercisesState } = createMockSetter<Exercise>();
            const { setter: setLogs, getState: getLogs, setState: setLogsState } = createMockSetter<Log>();
            
            setWorkoutsState([]);
            setExercisesState([]);
            setLogsState([]);
            
            // Create two workouts
            addWorkout('Push Day', 'user-1', setWorkouts);
            addWorkout('Pull Day', 'user-1', setWorkouts);
            const workouts = getWorkouts();
            const pushDayId = workouts[0].id;
            const pullDayId = workouts[1].id;
            
            // Add exercises to each
            addExercise(pushDayId, 'user-1', 'Bench Press', setExercises);
            addExercise(pullDayId, 'user-1', 'Pull Ups', setExercises);
            const exercises = getExercises();
            const benchPressId = exercises[0].id;
            const pullUpsId = exercises[1].id;
            
            // Add logs to each exercise
            addLog(pushDayId, benchPressId, 'user-1', 225, 5, 8, new Date(), setLogs);
            addLog(pullDayId, pullUpsId, 'user-1', 0, 10, 7, new Date(), setLogs);
            
            // Verify independence
            const logs = getLogs();
            expect(workouts).toHaveLength(2);
            expect(exercises).toHaveLength(2);
            expect(logs).toHaveLength(2);
            expect(logs[0].workoutID).toBe(pushDayId);
            expect(logs[1].workoutID).toBe(pullDayId);
        });
    });
});
