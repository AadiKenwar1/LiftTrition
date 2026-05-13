import { Dispatch, SetStateAction } from 'react';
import uuid from 'react-native-uuid';
import { Exercise, Log, Workout } from '../types';

// Increments the order of all workouts by 1 (used in tests and internally).
export function incrementWorkoutOrders(workouts: Workout[]): Workout[] {
    return workouts.map(w => ({ ...w, order: w.order + 1, updatedAt: new Date() }));
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

    setWorkouts(prev => {
        const incremented = prev.map(w => ({ ...w, order: w.order + 1, updatedAt: new Date() }));
        return [...incremented, newWorkout];
    });

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

// Archives OR unarchives a workout.
// Returns the updated workout (and all workouts that had their order bumped on unarchive).
export function archiveWorkout(
    id: string,
    archived: boolean,
    setWorkouts: Dispatch<SetStateAction<Workout[]>>
): Workout[] {
    let affected: Workout[] = [];
    setWorkouts(prev => {
        let next: Workout[];
        if (archived) {
            // Unarchive: put back at top, bump all active ones
            next = prev.map(w => {
                if (w.id === id) return { ...w, archived: false, order: 0, updatedAt: new Date() };
                return { ...w, order: w.order + 1, updatedAt: new Date() };
            });
        } else {
            // Archive: just mark archived
            next = prev.map(w => w.id === id ? { ...w, archived: true, updatedAt: new Date() } : w);
        }
        affected = next.filter(w => w.id === id || (archived && !w.archived));
        return next;
    });
    return affected;
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

    setWorkouts(prev => {
        const incremented = prev.map(w => ({ ...w, order: w.order + 1, updatedAt: now }));
        return [...incremented, newWorkout];
    });
    setExercises(prev => [...prev, ...newExercises]);

    return { newWorkout, newExercises };
}
