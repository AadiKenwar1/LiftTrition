// Workout Context Types
export interface Workout {
    id: string
    userID: string
    name: string
    order: number
    archived: boolean
    note: string
    createdAt: Date
    updatedAt: Date
}

export interface Exercise {
    id: string
    userID: string
    workoutID: string
    name: string
    userMax: number
    order: number
    archived: boolean
    createdAt: Date
    updatedAt: Date
}

export interface Log {
    id: string
    userID: string
    workoutID: string
    exerciseID: string
    date: Date
    time: number
    weight: number
    reps: number
    rpe: number
    createdAt: Date
    updatedAt: Date
}

export interface ExerciseLibraryEntry {
    mainMuscle: string
    accessoryMuscles: string[]
    fatigueFactor: number
    equipment: string
    isCompound: boolean
}

export type ExerciseLib = Record<string, ExerciseLibraryEntry>

export interface CreateExerciseData {
    name: string
    mainMuscle: string
    accessoryMuscles: string[]
    isCompound: boolean
    equipment: string
}

import { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'

export interface WorkoutContextInterface {
    workouts: Workout[]
    exercises: Exercise[]
    logs: Log[]
    fullExerciseLib: ExerciseLib
    fullExerciseLibAsList: ScrollableListItem[]
    userExercises: ExerciseLib
    loaded: boolean
    setUserExercises: (exercises: ExerciseLib) => void
    lastExercise: string
    setLastExercise: (exercise: string) => void
    handleAddWorkout: (name: string, userId: string) => void
    handleDuplicateWorkout: (id: string) => void
    handleDeleteWorkout: (id: string) => void
    handleArchiveWorkout: (id: string, archived: boolean) => void
    handleRenameWorkout: (id: string, name: string) => void
    handleUpdateWorkoutNote: (id: string, note: string) => void
    handleUpdateWorkoutOrder: (reorderedWorkouts: Workout[]) => void
    handleAddExercise: (workoutID: string, userID: string, name: string) => void
    handleDeleteExercise: (id: string) => void
    handleArchiveExercise: (id: string, workoutID: string, archived: boolean) => void
    handleUpdateExerciseOrder: (workoutID: string, reorderedExercises: Exercise[]) => void
    handleAddLog: (workoutID: string, exerciseID: string, userID: string, weight: number, reps: number, rpe: number, date: Date) => void
    handleDeleteLog: (id: string) => void
    handleCalculateFatiguePercentage: (numDays: number, activityLevel: string, currentBodyWeight: number, bwProgress: Record<string, number>) => number
    handleGetFatigueSummary: (activityLevel: string, currentBodyWeight: number, bwProgress: Record<string, number>) => { today: number; last3Days: number; last6Days: number; last9Days: number }
    getFatigueFeedback: (percentage: number) => string
    handleGetOneRepMaxData: (exerciseName: string) => Array<{ day: string; value: number }>
    handleGetSetsData: (onboardingCompletedAt?: Date) => Array<{ day: string; value: number }>
    handleCreateUserExercise: (exerciseData: CreateExerciseData, userID: string) => void
    handleDeleteUserExercise: (exerciseName: string) => void
}
