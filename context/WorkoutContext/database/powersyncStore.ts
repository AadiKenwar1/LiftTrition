import type {
    ExerciseRecord,
    LogRecord,
    UserExerciseRecord,
    WorkoutRecord
} from '@/lib/powersync/AppSchema';
import { powerSync } from '@/lib/powersync/system';
import { throwIfLoadFailureArmed } from '@/lib/devtools/forceLoadFailure';
import { throwIfSaveFailureArmed } from '@/lib/devtools/forceSaveFailure';
import { getDateKey, parseDateKey } from '@/lib/utils/dateHelper';
import { Exercise, ExerciseLib, ExerciseLibraryEntry, Log, Workout } from '../types';

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

// Map DB row -> Log
function rowToLog(row: LogRecord): Log {
    const parsedDate = row.date ? parseDateKey(row.date) : new Date();

    return {
        id: row.id!,
        userID: row.user_id!,
        workoutID: row.workout_id!,
        exerciseID: row.exercise_id!,
        date: parsedDate,
        time: row.time != null ? Number(row.time) : row.created_at ? new Date(row.created_at).getTime() : 0,
        weight: row.weight ?? 0,
        reps: row.reps ?? 0,
        rpe: row.rpe ?? 0,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
}

// Load all workout data from PowerSync
export async function loadWorkoutData(userId: string): Promise<{
    workouts: Workout[];
    exercises: Exercise[];
    logs: Log[];
    userExercises: ExerciseLib;
}> {
    if (__DEV__) await throwIfLoadFailureArmed('workout');

    const workoutRows = await powerSync.getAll(
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY "order" ASC',
        [userId]
    ) as WorkoutRecord[];

    const exerciseRows = await powerSync.getAll(
        'SELECT * FROM exercises WHERE user_id = ? ORDER BY "order" ASC',
        [userId]
    ) as ExerciseRecord[];

    const logRows = await powerSync.getAll(
        'SELECT * FROM logs WHERE user_id = ? ORDER BY date DESC, time DESC',
        [userId]
    ) as LogRecord[];

    const userExerciseRows = await powerSync.getAll(
        'SELECT * FROM user_exercises WHERE user_id = ?',
        [userId]
    ) as UserExerciseRecord[];

    const workouts = workoutRows.map(rowToWorkout);
    const exercises = exerciseRows.map(rowToExercise);
    const workoutIds = new Set(workouts.map((w) => w.id));
    const exerciseIds = new Set(exercises.map((e) => e.id));
    const logs = logRows.map(rowToLog).filter(
        (log) => workoutIds.has(log.workoutID) && exerciseIds.has(log.exerciseID)
    );

    const userExercises: ExerciseLib = {};
    for (const row of userExerciseRows) {
        if (row.name) {
            userExercises[row.name] = {
                mainMuscle: row.main_muscle || '',
                fatigueFactor: row.fatigue_factor ?? 0,
                equipment: row.equipment || '',
                isCompound: !!row.is_compound,
            };
        }
    }

    return { workouts, exercises, logs, userExercises };
}

/**
 * Insert a new workout and bump order on all pre-existing workouts for this user.
 * Both ops are in one transaction so order is never partially updated.
 */
export async function insertWorkoutWithOrderBump(workout: Workout): Promise<void> {
    if (__DEV__) await throwIfSaveFailureArmed('workout')
    await powerSync.writeTransaction(async (tx) => {
        await tx.execute(
            'UPDATE workouts SET "order" = "order" + 1, updated_at = datetime(\'now\') WHERE user_id = ? AND archived = 0',
            [workout.userID]
        );
        await tx.execute(
            `INSERT INTO workouts (id, user_id, name, "order", archived, note, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [workout.id, workout.userID, workout.name, workout.order, workout.archived ? 1 : 0, workout.note]
        );
    });
}

/**
 * Upsert a single workout row (for rename, note, archive toggle, etc.).
 */
export async function upsertWorkout(workout: Workout): Promise<void> {
    await powerSync.writeTransaction(async (tx) => {
        const existing = await tx.getAll(
            'SELECT id FROM workouts WHERE id = ?', [workout.id]
        ) as WorkoutRecord[];

        if (existing.length > 0) {
            await tx.execute(
                `UPDATE workouts SET name = ?, "order" = ?, archived = ?, note = ?, updated_at = datetime('now') WHERE id = ?`,
                [workout.name, workout.order, workout.archived ? 1 : 0, workout.note, workout.id]
            );
        } else {
            await tx.execute(
                `INSERT INTO workouts (id, user_id, name, "order", archived, note, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [workout.id, workout.userID, workout.name, workout.order, workout.archived ? 1 : 0, workout.note]
            );
        }
    });
}

/**
 * Update order on a batch of workouts (drag-and-drop / archive unarchive order bumps).
 */
export async function updateWorkoutOrders(workouts: Workout[]): Promise<void> {
    if (workouts.length === 0) return;
    await powerSync.writeTransaction(async (tx) => {
        for (const w of workouts) {
            await tx.execute(
                `UPDATE workouts SET "order" = ?, updated_at = datetime('now') WHERE id = ?`,
                [w.order, w.id]
            );
        }
    });
}

/**
 * Insert new workout + its duplicated exercises in one transaction.
 * Also bumps order on all active workouts for the user.
 */
export async function insertDuplicateWorkout(workout: Workout, exercises: Exercise[]): Promise<void> {
    await powerSync.writeTransaction(async (tx) => {
        await tx.execute(
            'UPDATE workouts SET "order" = "order" + 1, updated_at = datetime(\'now\') WHERE user_id = ? AND archived = 0',
            [workout.userID]
        );
        await tx.execute(
            `INSERT INTO workouts (id, user_id, name, "order", archived, note, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [workout.id, workout.userID, workout.name, workout.order, workout.archived ? 1 : 0, workout.note]
        );
        for (const ex of exercises) {
            await tx.execute(
                `INSERT INTO exercises (id, user_id, workout_id, name, user_max, "order", archived, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [ex.id, ex.userID, ex.workoutID, ex.name, ex.userMax, ex.order, ex.archived ? 1 : 0]
            );
        }
    });
}

/**
 * Insert a new exercise and bump order on sibling exercises in the same workout.
 */
export async function insertExerciseWithOrderBump(exercise: Exercise): Promise<void> {
    if (__DEV__) await throwIfSaveFailureArmed('workout')
    await powerSync.writeTransaction(async (tx) => {
        await tx.execute(
            'UPDATE exercises SET "order" = "order" + 1, updated_at = datetime(\'now\') WHERE workout_id = ? AND archived = 0',
            [exercise.workoutID]
        );
        await tx.execute(
            `INSERT INTO exercises (id, user_id, workout_id, name, user_max, "order", archived, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [exercise.id, exercise.userID, exercise.workoutID, exercise.name, exercise.userMax, exercise.order, exercise.archived ? 1 : 0]
        );
    });
}

/**
 * Insert multiple new exercises in one transaction and bump sibling orders by the count.
 */
export async function insertExercisesWithOrderBump(exercises: Exercise[]): Promise<void> {
    if (exercises.length === 0) return
    const workoutID = exercises[0].workoutID
    await powerSync.writeTransaction(async (tx) => {
        await tx.execute(
            'UPDATE exercises SET "order" = "order" + ?, updated_at = datetime(\'now\') WHERE workout_id = ? AND archived = 0',
            [exercises.length, workoutID]
        )
        for (const exercise of exercises) {
            await tx.execute(
                `INSERT INTO exercises (id, user_id, workout_id, name, user_max, "order", archived, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [exercise.id, exercise.userID, exercise.workoutID, exercise.name, exercise.userMax, exercise.order, exercise.archived ? 1 : 0]
            )
        }
    })
}

/**
 * Upsert a single exercise row (for archive toggle, userMax update, etc.).
 */
export async function upsertExercise(exercise: Exercise): Promise<void> {
    await powerSync.writeTransaction(async (tx) => {
        const existing = await tx.getAll(
            'SELECT id FROM exercises WHERE id = ?', [exercise.id]
        ) as ExerciseRecord[];

        if (existing.length > 0) {
            await tx.execute(
                `UPDATE exercises SET workout_id = ?, name = ?, user_max = ?, "order" = ?, archived = ?, updated_at = datetime('now') WHERE id = ?`,
                [exercise.workoutID, exercise.name, exercise.userMax, exercise.order, exercise.archived ? 1 : 0, exercise.id]
            );
        } else {
            await tx.execute(
                `INSERT INTO exercises (id, user_id, workout_id, name, user_max, "order", archived, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [exercise.id, exercise.userID, exercise.workoutID, exercise.name, exercise.userMax, exercise.order, exercise.archived ? 1 : 0]
            );
        }
    });
}

/**
 * Update order on a batch of exercises (drag-and-drop / archive-unarchive bumps).
 */
export async function updateExerciseOrders(exercises: Exercise[]): Promise<void> {
    if (exercises.length === 0) return;
    await powerSync.writeTransaction(async (tx) => {
        for (const ex of exercises) {
            await tx.execute(
                `UPDATE exercises SET "order" = ?, updated_at = datetime('now') WHERE id = ?`,
                [ex.order, ex.id]
            );
        }
    });
}

/**
 * Insert a single log row.
 */
export async function insertLog(log: Log): Promise<void> {
    if (__DEV__) await throwIfSaveFailureArmed('workout');
    const localDate = new Date(log.date);
    localDate.setHours(0, 0, 0, 0);

    await powerSync.execute(
        `INSERT INTO logs (id, user_id, workout_id, exercise_id, date, time, weight, reps, rpe, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [log.id, log.userID, log.workoutID, log.exerciseID, getDateKey(localDate), log.time, log.weight, log.reps, log.rpe]
    );
}

/**
 * Upsert a single user_exercises row by (userId, name).
 */
export async function upsertUserExercise(userId: string, name: string, entry: ExerciseLibraryEntry): Promise<void> {
    await powerSync.writeTransaction(async (tx) => {
        const existing = await tx.getAll(
            'SELECT name FROM user_exercises WHERE user_id = ? AND name = ?', [userId, name]
        ) as UserExerciseRecord[];

        if (existing.length > 0) {
            await tx.execute(
                `UPDATE user_exercises SET main_muscle = ?, accessory_muscles = ?, fatigue_factor = ?, equipment = ?, is_compound = ?, updated_at = datetime('now')
                 WHERE user_id = ? AND name = ?`,
                [entry.mainMuscle, '[]', entry.fatigueFactor, entry.equipment, entry.isCompound ? 1 : 0, userId, name]
            );
        } else {
            await tx.execute(
                `INSERT INTO user_exercises (id, user_id, name, main_muscle, accessory_muscles, fatigue_factor, equipment, is_compound, created_at, updated_at)
                 VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [userId, name, entry.mainMuscle, '[]', entry.fatigueFactor, entry.equipment, entry.isCompound ? 1 : 0]
            );
        }
    });
}
