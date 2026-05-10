import type {
    ExerciseRecord,
    LogRecord,
    UserExerciseRecord,
    WorkoutRecord
} from '@/lib/powersync/AppSchema';
import { powerSync } from '@/lib/powersync/system';
import { getDateKey } from '@/lib/utils/dateHelper';
import { Exercise, ExerciseLib, Log, Workout } from '../types';

// Map DB row -> Workout
function rowToWorkout(row: WorkoutRecord): Workout {
    return {
        id: row.id!,
        userID: row.user_id!,
        name: row.name!,
        order: row.order ?? 0,
        archived: !!row.archived,
        note: row.note ?? '',
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
}

// Map Workout -> DB row
function workoutToRow(workout: Workout) {
    return {
        user_id: workout.userID,
        name: workout.name,
        order: workout.order,
        archived: workout.archived ? 1 : 0,
        note: workout.note,
        created_at: workout.createdAt.toISOString(),
        updated_at: workout.updatedAt.toISOString(),
    };
}

// Map DB row -> Exercise
function rowToExercise(row: ExerciseRecord): Exercise {
    return {
        id: row.id!,
        userID: row.user_id!,
        workoutID: row.workout_id!,
        name: row.name!,
        userMax: row.user_max ?? 0,
        order: row.order ?? 0,
        archived: !!row.archived,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
}

// Map Exercise -> DB row
function exerciseToRow(exercise: Exercise) {
    return {
        user_id: exercise.userID,
        workout_id: exercise.workoutID,
        name: exercise.name,
        user_max: exercise.userMax,
        order: exercise.order,
        archived: exercise.archived ? 1 : 0,
        created_at: exercise.createdAt.toISOString(),
        updated_at: exercise.updatedAt.toISOString(),
    };
}

// Map DB row -> Log
function rowToLog(row: LogRecord): Log {
    // Parse date string in local timezone to avoid timezone issues
    let parsedDate: Date;
    if (row.date) {
        // Parse "YYYY-MM-DD" as local date, not UTC
        const [year, month, day] = row.date.split('-').map(Number);
        parsedDate = new Date(year, month - 1, day);
    } else {
        parsedDate = new Date();
    }
    
    return {
        id: row.id!,
        userID: row.user_id!,
        workoutID: row.workout_id!,
        exerciseID: row.exercise_id!,
        date: parsedDate,
        time:
            row.time != null ? Number(row.time) : row.created_at ? new Date(row.created_at).getTime() : 0,
        weight: row.weight ?? 0,
        reps: row.reps ?? 0,
        rpe: row.rpe ?? 0,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
}

// Map Log -> DB row
function logToRow(log: Log) {
    // Normalize the date to start of day in local timezone before getting the date key
    const localDate = new Date(log.date);
    localDate.setHours(0, 0, 0, 0);
    
    return {
        user_id: log.userID,
        workout_id: log.workoutID,
        exercise_id: log.exerciseID,
        date: getDateKey(localDate),  // Use getDateKey to get local date string (YYYY-MM-DD)
        time: log.time,
        weight: log.weight,
        reps: log.reps,
        rpe: log.rpe,
        created_at: log.createdAt.toISOString(),
        updated_at: log.updatedAt.toISOString(),
    };
}

// Load all workout data from PowerSync
export async function loadWorkoutData(userId: string): Promise<{
    workouts: Workout[];
    exercises: Exercise[];
    logs: Log[];
    userExercises: ExerciseLib;
    hasData: boolean;
}> {
    // Load workouts
    const workoutRows = await powerSync.getAll(
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY "order" ASC',
        [userId]
    ) as WorkoutRecord[];

    // Load exercises
    const exerciseRows = await powerSync.getAll(
        'SELECT * FROM exercises WHERE user_id = ? ORDER BY "order" ASC',
        [userId]
    ) as ExerciseRecord[];

    // Load logs
    const logRows = await powerSync.getAll(
        'SELECT * FROM logs WHERE user_id = ? ORDER BY date DESC, time DESC',
        [userId]
    ) as LogRecord[];

    // Load user exercises
    const userExerciseRows = await powerSync.getAll(
        'SELECT * FROM user_exercises WHERE user_id = ?',
        [userId]
    ) as UserExerciseRecord[];

    // Convert to types
    const workouts = workoutRows.map(rowToWorkout);
    const exercises = exerciseRows.map(rowToExercise);
    const workoutIds = new Set(workouts.map((w) => w.id))
    const exerciseIds = new Set(exercises.map((e) => e.id))
    // Drop orphan logs (e.g. leftover rows after workout delete before child deletes existed)
    const logs = logRows.map(rowToLog).filter((log) => workoutIds.has(log.workoutID) && exerciseIds.has(log.exerciseID))

    // Convert user_exercises rows to ExerciseLib object
    const userExercises: ExerciseLib = {};
    for (const row of userExerciseRows) {
        if (row.name) {
            // Parse accessory_muscles from JSON string or array
            let accessoryMuscles: string[] = [];
            if (row.accessory_muscles) {
                if (typeof row.accessory_muscles === 'string') {
                    try {
                        accessoryMuscles = JSON.parse(row.accessory_muscles);
                    } catch {
                        accessoryMuscles = [];
                    }
                } else if (Array.isArray(row.accessory_muscles)) {
                    accessoryMuscles = row.accessory_muscles;
                }
            }
            
            userExercises[row.name] = {
                mainMuscle: row.main_muscle || '',
                accessoryMuscles,
                fatigueFactor: row.fatigue_factor ?? 0,
                equipment: row.equipment || '',
                isCompound: !!row.is_compound,
            };
        }
    }

    const hasData = workouts.length > 0 || exercises.length > 0 || logs.length > 0 || Object.keys(userExercises).length > 0;

    return { workouts, exercises, logs, userExercises, hasData };
}

// Save all workout data to PowerSync
// Uses writeTransaction to group all operations (best practice from PowerSync docs)
export async function saveWorkoutData(
    userId: string,
    workouts: Workout[],
    exercises: Exercise[],
    logs: Log[],
    userExercises: ExerciseLib
): Promise<void> {
    await powerSync.writeTransaction(async (tx) => {
        // Save workouts
        for (const workout of workouts) {
            const row = workoutToRow(workout);

            // Check if workout exists
            const existing = await tx.getAll(
                'SELECT id FROM workouts WHERE id = ?',
                [workout.id]
            ) as WorkoutRecord[];

            if (existing.length > 0) {
                // Update existing workout
                await tx.execute(
                    `UPDATE workouts SET
                       name = ?,
                       "order" = ?,
                       archived = ?,
                       note = ?,
                       updated_at = datetime('now')
                     WHERE id = ?`,
                    [row.name, row.order, row.archived, row.note, workout.id]
                );
            } else {
                // Insert new workout
                await tx.execute(
                    `INSERT INTO workouts (
                       id, user_id, name, "order", archived, note, created_at, updated_at
                     )
                     VALUES (
                       ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
                     )`,
                    [workout.id, row.user_id, row.name, row.order, row.archived, row.note]
                );
            }
        }

        // Save exercises
        for (const exercise of exercises) {
            const row = exerciseToRow(exercise);

            const existing = await tx.getAll(
                'SELECT id FROM exercises WHERE id = ?',
                [exercise.id]
            ) as ExerciseRecord[];

            if (existing.length > 0) {
                await tx.execute(
                    `UPDATE exercises SET
                       workout_id = ?,
                       name = ?,
                       user_max = ?,
                       "order" = ?,
                       archived = ?,
                       updated_at = datetime('now')
                     WHERE id = ?`,
                    [row.workout_id, row.name, row.user_max, row.order, row.archived, exercise.id]
                );
            } else {
                await tx.execute(
                    `INSERT INTO exercises (
                       id, user_id, workout_id, name, user_max, "order", archived, created_at, updated_at
                     )
                     VALUES (
                       ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
                     )`,
                    [exercise.id, row.user_id, row.workout_id, row.name, row.user_max, row.order, row.archived]
                );
            }
        }

        // Save logs
        for (const log of logs) {
            const row = logToRow(log);

            const existing = await tx.getAll(
                'SELECT id FROM logs WHERE id = ?',
                [log.id]
            ) as LogRecord[];

            if (existing.length > 0) {
                await tx.execute(
                    `UPDATE logs SET
                       workout_id = ?,
                       exercise_id = ?,
                       date = ?,
                       time = ?,
                       weight = ?,
                       reps = ?,
                       rpe = ?,
                       updated_at = datetime('now')
                     WHERE id = ?`,
                    [row.workout_id, row.exercise_id, row.date, row.time, row.weight, row.reps, row.rpe, log.id]
                );
            } else {
                await tx.execute(
                    `INSERT INTO logs (
                       id, user_id, workout_id, exercise_id, date, time, weight, reps, rpe, created_at, updated_at
                     )
                     VALUES (
                       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                     )`,
                    [
                        log.id,
                        row.user_id,
                        row.workout_id,
                        row.exercise_id,
                        row.date,
                        row.time,
                        row.weight,
                        row.reps,
                        row.rpe,
                        row.created_at,
                        row.updated_at,
                    ]
                );
            }
        }

        // Save user exercises (convert ExerciseLib to rows)
        // First, get all existing user exercises for this user
        const existingUserExercises = await tx.getAll(
            'SELECT name FROM user_exercises WHERE user_id = ?',
            [userId]
        ) as UserExerciseRecord[];

        const existingNames = new Set(existingUserExercises.map(row => row.name).filter(Boolean));

        // Save/update exercises that are in the ExerciseLib
        for (const [name, entry] of Object.entries(userExercises)) {
            const accessoryMusclesJson = JSON.stringify(entry.accessoryMuscles);

            if (existingNames.has(name)) {
                // Update existing
                await tx.execute(
                    `UPDATE user_exercises SET
                       main_muscle = ?,
                       accessory_muscles = ?,
                       fatigue_factor = ?,
                       equipment = ?,
                       is_compound = ?,
                       updated_at = datetime('now')
                     WHERE user_id = ? AND name = ?`,
                    [entry.mainMuscle, accessoryMusclesJson, entry.fatigueFactor, entry.equipment, entry.isCompound ? 1 : 0, userId, name]
                );
            } else {
                // Insert new
                await tx.execute(
                    `INSERT INTO user_exercises (
                       id, user_id, name, main_muscle, accessory_muscles, fatigue_factor, equipment, is_compound, created_at, updated_at
                     )
                     VALUES (
                       uuid(), ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
                     )`,
                    [userId, name, entry.mainMuscle, accessoryMusclesJson, entry.fatigueFactor, entry.equipment, entry.isCompound ? 1 : 0]
                );
            }
        }

        // Delete user exercises that are no longer in the ExerciseLib
        const currentNames = new Set(Object.keys(userExercises));
        for (const existing of existingUserExercises) {
            if (existing.name && !currentNames.has(existing.name)) {
                await tx.execute(
                    'DELETE FROM user_exercises WHERE user_id = ? AND name = ?',
                    [userId, existing.name]
                );
            }
        }
    });
}
