import { Dispatch, SetStateAction } from 'react';
import { ExerciseLib, ExerciseLibraryEntry } from '../types';
import { calculateFatigueFactor } from './fatigueFunctions';

export interface CreateExerciseData {
    name: string;
    mainMuscle: string;
    isCompound: boolean;
    equipment: string;
}

// Creates a new user exercise; returns the entry so the caller can persist it.
export function createUserExercise(
    exerciseData: CreateExerciseData,
    userID: string,
    setUserExercises: Dispatch<SetStateAction<ExerciseLib>>
): ExerciseLibraryEntry {
    const { name, mainMuscle, isCompound, equipment } = exerciseData;
    const fatigueFactor = calculateFatigueFactor(isCompound, mainMuscle, equipment);
    const newEntry: ExerciseLibraryEntry = { mainMuscle, fatigueFactor, equipment, isCompound };
    setUserExercises(prev => ({ ...prev, [name]: newEntry }));
    return newEntry;
}

// Deletes a user-created exercise from state only.
export function deleteUserExercise(
    exerciseName: string,
    setUserExercises: Dispatch<SetStateAction<ExerciseLib>>
): void {
    setUserExercises(prev => {
        const updated = { ...prev };
        delete updated[exerciseName];
        return updated;
    });
}
