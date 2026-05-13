import { Dispatch, SetStateAction } from 'react'
import uuid from 'react-native-uuid'
import { Exercise, Log } from '../types'

// Increments the order of all exercises in a specific workout by 1 (used in tests and internally).
export function incrementExerciseOrders(exercises: Exercise[], workoutID: string): Exercise[] {
    return exercises.map(e => e.workoutID === workoutID ? { ...e, order: e.order + 1, updatedAt: new Date() } : e);
}

// Adds a new exercise; returns it so the caller can persist it.
export function addExercise(
    workoutID: string,
    userID: string,
    name: string,
    setExercises: Dispatch<SetStateAction<Exercise[]>>
): Exercise {
    const newExercise: Exercise = {
        id: uuid.v4(),
        userID,
        workoutID,
        name,
        userMax: 0,
        order: 0,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    setExercises(prev => {
        const incremented = prev.map(e =>
            e.workoutID === workoutID ? { ...e, order: e.order + 1, updatedAt: new Date() } : e
        );
        return [...incremented, newExercise];
    });

    return newExercise;
}

// Deletes an exercise and its logs from state only.
export function deleteExercise(
    id: string,
    setExercises: Dispatch<SetStateAction<Exercise[]>>,
    setLogs: Dispatch<SetStateAction<Log[]>>
): void {
    setExercises(prev => prev.filter(e => e.id !== id));
    setLogs(prev => prev.filter(l => l.exerciseID !== id));
}

// Archives or unarchives an exercise.
// Returns all affected exercises so the caller can persist order changes.
export function archiveExercise(
    id: string,
    workoutID: string,
    archived: boolean,
    setExercises: Dispatch<SetStateAction<Exercise[]>>
): Exercise[] {
    let affected: Exercise[] = [];
    setExercises(prev => {
        let next: Exercise[];
        if (archived) {
            // Unarchive: put back at top of workout, bump active siblings
            next = prev.map(e => {
                if (e.id === id) return { ...e, archived: false, order: 0, updatedAt: new Date() };
                if (e.workoutID === workoutID) return { ...e, order: e.order + 1, updatedAt: new Date() };
                return e;
            });
        } else {
            // Archive: just mark archived
            next = prev.map(e => e.id === id ? { ...e, archived: true, updatedAt: new Date() } : e);
        }
        affected = next.filter(e => e.id === id || (archived && e.workoutID === workoutID && e.id !== id));
        return next;
    });
    return affected;
}

// Updates exercise order after drag-and-drop; returns reordered exercises.
export function updateExerciseOrder(
    workoutID: string,
    reorderedExercises: Exercise[],
    setExercises: Dispatch<SetStateAction<Exercise[]>>
): Exercise[] {
    const withOrder = reorderedExercises.map((e, i) => ({ ...e, order: i, updatedAt: new Date() }));
    setExercises(prev => prev.map(e => {
        if (e.workoutID !== workoutID) return e;
        const updated = withOrder.find(u => u.id === e.id);
        return updated ?? e;
    }));
    return withOrder;
}
