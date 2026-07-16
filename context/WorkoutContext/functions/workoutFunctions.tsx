import { Dispatch, SetStateAction } from 'react';
import uuid from 'react-native-uuid';
import { Exercise, Log, Workout } from '../types';

// Bumps the order of all ACTIVE workouts by 1 — archived rows keep their
// order, matching the SQL bumpers' WHERE archived = 0.
export function incrementWorkoutOrders(workouts: Workout[]): Workout[] {
    return workouts.map(w => (w.archived ? w : { ...w, order: w.order + 1, updatedAt: new Date() }));
}

// Adds a new workout; returns the new workout so the caller can persist it.
export function addWorkout(
    name: string,
    userId: string,
    setWorkouts: Dispatch<SetStateAction<Workout[]>>
): Workout {
    const newWorkout: Workout = {
        id: uuid.v4(),
        userID: userId,
        name,
        order: 0,
        archived: false,
        note: '',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    setWorkouts(prev => [...incrementWorkoutOrders(prev), newWorkout]);

    return newWorkout;
}

// Deletes a workout and its exercises/logs from state only.
export function deleteWorkout(
    id: string,
    setWorkouts: Dispatch<SetStateAction<Workout[]>>,
    setExercises: Dispatch<SetStateAction<Exercise[]>>,
    setLogs: Dispatch<SetStateAction<Log[]>>
): void {
    setWorkouts(prev => prev.filter(w => w.id !== id));
    setExercises(prev => prev.filter(e => e.workoutID !== id));
    setLogs(prev => prev.filter(l => l.workoutID !== id));
}

// Archives OR unarchives a workout (state only; the provider persists via SQL).
// Unarchive: target → active at order 0, active siblings bump. Archive: target
// → archived at order 0, archived siblings bump. Mirrors the inline SQL in
// WorkoutContext's handleArchiveWorkout exactly.
export function archiveWorkout(
    id: string,
    archived: boolean,
    setWorkouts: Dispatch<SetStateAction<Workout[]>>
): void {
    const now = new Date();
    setWorkouts(prev => prev.map(w => {
        if (w.id === id) return { ...w, archived: !archived, order: 0, updatedAt: now };
        if (w.archived === !archived) return { ...w, order: w.order + 1, updatedAt: now };
        return w;
    }));
}

// Renames a workout; returns the updated workout.
export function renameWorkout(
    id: string,
    name: string,
    setWorkouts: Dispatch<SetStateAction<Workout[]>>
): Workout | undefined {
    let updated: Workout | undefined;
    setWorkouts(prev => prev.map(w => {
        if (w.id !== id) return w;
        updated = { ...w, name, updatedAt: new Date() };
        return updated;
    }));
    return updated;
}

// Updates a workout's note; returns the updated workout.
export function updateWorkoutNote(
    id: string,
    note: string,
    setWorkouts: Dispatch<SetStateAction<Workout[]>>
): Workout | undefined {
    let updated: Workout | undefined;
    setWorkouts(prev => prev.map(w => {
        if (w.id !== id) return w;
        updated = { ...w, note, updatedAt: new Date() };
        return updated;
    }));
    return updated;
}

// Updates workout order after drag-and-drop; returns all reordered workouts.
export function updateWorkoutOrder(
    reorderedWorkouts: Workout[],
    setWorkouts: Dispatch<SetStateAction<Workout[]>>
): Workout[] {
    const withOrder = reorderedWorkouts.map((w, i) => ({ ...w, order: i, updatedAt: new Date() }));
    setWorkouts(prev => prev.map(w => {
        const updated = withOrder.find(u => u.id === w.id);
        return updated ?? w;
    }));
    return withOrder;
}

// Duplicates a workout and its non-archived exercises.
// Returns { newWorkout, newExercises } so the caller can persist them.
export function duplicateWorkout(
    sourceWorkoutId: string,
    userId: string,
    workouts: Workout[],
    exercises: Exercise[],
    setWorkouts: Dispatch<SetStateAction<Workout[]>>,
    setExercises: Dispatch<SetStateAction<Exercise[]>>,
): { newWorkout: Workout; newExercises: Exercise[] } | null {
    const source = workouts.find(w => w.id === sourceWorkoutId);
    if (!source) return null;

    const now = new Date();
    const newWorkoutId = uuid.v4() as string;

    const newWorkout: Workout = {
        id: newWorkoutId,
        userID: userId,
        name: `${source.name} (Copy)`,
        order: 0,
        archived: false,
        note: source.note,
        createdAt: now,
        updatedAt: now,
    };

    const newExercises: Exercise[] = exercises
        .filter(e => e.workoutID === sourceWorkoutId && !e.archived)
        .sort((a, b) => a.order - b.order)
        .map((ex, index) => ({
            id: uuid.v4() as string,
            userID: userId,
            workoutID: newWorkoutId,
            name: ex.name,
            userMax: ex.userMax,
            order: index,
            archived: false,
            createdAt: now,
            updatedAt: now,
        }));

    setWorkouts(prev => [...incrementWorkoutOrders(prev), newWorkout]);
    setExercises(prev => [...prev, ...newExercises]);

    return { newWorkout, newExercises };
}
