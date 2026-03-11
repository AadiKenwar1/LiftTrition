import { Dispatch, SetStateAction } from 'react';
import { ExerciseLib, ExerciseLibraryEntry } from '../types';
import { calculateFatigueFactor } from './fatigueFunctions';

export interface CreateExerciseData {
  name: string;
  mainMuscle: string;
  accessoryMuscles: string[];
  isCompound: boolean;
  equipment: string;
}

//Creates a new user exercise and adds it to the exercise library
export function createUserExercise(exerciseData: CreateExerciseData, userID: string, setUserExercises: Dispatch<SetStateAction<ExerciseLib>>): void {
  const { name, mainMuscle, accessoryMuscles, isCompound, equipment } = exerciseData;
  const fatigueFactor = calculateFatigueFactor(isCompound, mainMuscle, accessoryMuscles, equipment);
  const newExercise: ExerciseLibraryEntry = {mainMuscle, accessoryMuscles, fatigueFactor, equipment, isCompound};
  setUserExercises(prev => ({...prev, [name]: newExercise}));
}

//Deletes a user-created exercise from the library
export function deleteUserExercise(exerciseName: string, setUserExercises: Dispatch<SetStateAction<ExerciseLib>>): void {
  setUserExercises(prev => {
    const updated = { ...prev };
    delete updated[exerciseName];
    return updated;
  });  
}