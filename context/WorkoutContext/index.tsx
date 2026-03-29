import { useAuth } from '@/context/AuthContext'
import { convertExerciseLibraryToList, exerciseLib } from '@/context/WorkoutContext/exerciseLibrary'
import { powerSync } from '@/lib/powersync/system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react'
import { loadWorkoutData, saveWorkoutData } from './database/powersyncStore'
import { createUserExercise, deleteUserExercise } from './functions/createExerciseFunctions'
import { addExercise, archiveExercise, deleteExercise, updateExerciseOrder } from './functions/exerciseFunctions'
import { calculateFatiguePercentage, getFatigueFeedback } from './functions/fatigueFunctions'
import { getOneRepMaxData } from './functions/graphFunctions'
import { addLog, deleteLog } from './functions/logFunctions'
import { getVolumeData } from './functions/volumeFunctions'
import { addWorkout, archiveWorkout, deleteWorkout, duplicateWorkout, renameWorkout, updateWorkoutNote, updateWorkoutOrder } from './functions/workoutFunctions'
import { CreateExerciseData, Exercise, ExerciseLib, Log, Workout, WorkoutContextInterface } from './types'

const WorkoutContext = createContext<WorkoutContextInterface | undefined>(undefined)

export const WorkoutProvider = ({ children }: PropsWithChildren) => {
    const [workouts, setWorkouts] = useState<Workout[]>([])
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [logs, setLogs] = useState<Log[]>([])
    const [userExercises, setUserExercises] = useState<ExerciseLib>({})
    const [fullExerciseLib, setFullExerciseLib] = useState<ExerciseLib>(exerciseLib)
    const [lastExercise, setLastExercise] = useState<string>('')
    const [loaded, setLoaded] = useState(false)
    const [hasLoadedUserData, setHasLoadedUserData] = useState(false)

    const { userID } = useAuth()

    //Wrapper Functions
    const handleAddWorkout = (name: string, userId: string) => addWorkout(name, userId, setWorkouts)
    const handleDuplicateWorkout = (id: string) => {
        if (!userID) return
        duplicateWorkout(id, userID, setWorkouts, setExercises)
    }
    const handleDeleteWorkout = async (id: string) => {
        deleteWorkout(id, setWorkouts, setExercises, setLogs)
        // Delete from PowerSync (exercises and logs will cascade delete)
        if (userID) {
            try {
                await powerSync.execute('DELETE FROM workouts WHERE id = ?', [id])
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete workout from PowerSync', e)
            }
        }
    }
    const handleArchiveWorkout = (id: string, archived: boolean) => archiveWorkout(id, archived, setWorkouts)
    const handleRenameWorkout = (id: string, name: string) => renameWorkout(id, name, setWorkouts)
    const handleUpdateWorkoutNote = (id: string, note: string) => updateWorkoutNote(id, note, setWorkouts)
    const handleUpdateWorkoutOrder = (reorderedWorkouts: Workout[]) => updateWorkoutOrder(reorderedWorkouts, setWorkouts)
    const handleAddExercise = (workoutID: string, userID: string, name: string) => addExercise(workoutID, userID, name, setExercises)
    const handleDeleteExercise = async (id: string) => {
        deleteExercise(id, setExercises, setLogs)
        // Delete from PowerSync (logs will cascade delete)
        if (userID) {
            try {
                await powerSync.execute('DELETE FROM exercises WHERE id = ?', [id])
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete exercise from PowerSync', e)
            }
        }
    }
    const handleArchiveExercise = (id: string, workoutID: string, archived: boolean) => archiveExercise(id, workoutID, archived, setExercises)
    const handleUpdateExerciseOrder = (workoutID: string, reorderedExercises: Exercise[]) => updateExerciseOrder(workoutID, reorderedExercises, setExercises)
    const handleAddLog = (workoutID: string, exerciseID: string, userID: string, weight: number, reps: number, rpe: number, date: Date) => addLog(workoutID, exerciseID, userID, weight, reps, rpe, date, setLogs)
    const handleDeleteLog = async (id: string) => {
        deleteLog(id, setLogs)
        // Delete from PowerSync
        if (userID) {
            try {
                await powerSync.execute('DELETE FROM logs WHERE id = ?', [id])
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete log from PowerSync', e)
            }
        }
    }
    const handleCalculateFatiguePercentage = (numDays: number, activityLevel: string) => calculateFatiguePercentage(numDays, logs, exercises, fullExerciseLib, activityLevel)
    const handleGetOneRepMaxData = (exerciseName: string) => getOneRepMaxData(exerciseName, exercises, logs)
    const handleGetVolumeData = (onboardingCompletedAt?: Date) => getVolumeData(logs, onboardingCompletedAt)
    const handleCreateUserExercise = (exerciseData: CreateExerciseData, userID: string) => createUserExercise(exerciseData, userID, setUserExercises)
    const handleDeleteUserExercise = async (exerciseName: string) => {
        deleteUserExercise(exerciseName, setUserExercises)
        // Delete from PowerSync
        if (userID) {
            try {
                await powerSync.execute('DELETE FROM user_exercises WHERE user_id = ? AND name = ?', [userID, exerciseName])
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete user exercise from PowerSync', e)
            }
        }
    }

    // Use useEffect to merge base library with user exercises whenever userExercises changes
    useEffect(() => {
        setFullExerciseLib({ ...exerciseLib, ...userExercises })
    }, [userExercises])

    // Convert fullExerciseLib to list format for ScrollableList components
    const fullExerciseLibAsList = useMemo(() => {
        return convertExerciseLibraryToList(fullExerciseLib)
    }, [fullExerciseLib])

    // Load lastExercise from AsyncStorage when user changes
    useEffect(() => {
        const loadLastExercise = async () => {
            if (!userID) {
                setLastExercise('')
                return
            }

            try {
                const stored = await AsyncStorage.getItem(`lastExercise:${userID}`)
                setLastExercise(stored ?? '')
            } catch (e) {
                console.warn('[WorkoutContext] Failed to load lastExercise from AsyncStorage', e)
                setLastExercise('')
            }
        }

        loadLastExercise()
    }, [userID])

    // Load from PowerSync
    useEffect(() => {
        if (!userID) {
            setWorkouts([])
            setExercises([])
            setLogs([])
            setUserExercises({})
            setLoaded(true)
            setHasLoadedUserData(false)
            return
        }

        setLoaded(false)
        setHasLoadedUserData(false)

        const loadData = async () => {
            try {
                // Wait for PowerSync to sync before loading data
                await powerSync.waitForFirstSync()
                const { workouts, exercises, logs, userExercises, hasData } = await loadWorkoutData(userID)
                setWorkouts(workouts)
                setExercises(exercises)
                setLogs(logs)
                setUserExercises(userExercises)
                setHasLoadedUserData(hasData)
                setLoaded(true)
            } catch (e) {
                console.warn('[WorkoutContext] Failed to load workout data from PowerSync', e)
                setWorkouts([])
                setExercises([])
                setLogs([])
                setUserExercises({})
                setHasLoadedUserData(false)
                setLoaded(true)
            }
        }

        loadData()
    }, [userID])

    // Set hasLoadedUserData to true when user creates data (so new users can save)
    useEffect(() => {
        const hasData = workouts.length > 0 || exercises.length > 0 || logs.length > 0 || Object.keys(userExercises).length > 0
        if (hasData && !hasLoadedUserData) {
            setHasLoadedUserData(true)
        }
    }, [workouts, exercises, logs, userExercises, hasLoadedUserData])

    // Save to PowerSync - ONLY if we've loaded actual user data or user has created data
    useEffect(() => {
        if (!loaded || !userID || !hasLoadedUserData) return

        saveWorkoutData(userID, workouts, exercises, logs, userExercises).catch(() => {})
    }, [workouts, exercises, logs, userExercises, loaded, userID, hasLoadedUserData])

    // Persist lastExercise per-user in AsyncStorage
    useEffect(() => {
        const saveLastExercise = async () => {
            if (!userID) return

            try {
                if (lastExercise) {
                    await AsyncStorage.setItem(`lastExercise:${userID}`, lastExercise)
                } else {
                    await AsyncStorage.removeItem(`lastExercise:${userID}`)
                }
            } catch (e) {
                console.warn('[WorkoutContext] Failed to persist lastExercise to AsyncStorage', e)
            }
        }

        saveLastExercise()
    }, [lastExercise, userID])

    return (
        <WorkoutContext.Provider
            value={{
                workouts,
                exercises,
                logs,
                fullExerciseLib,
                fullExerciseLibAsList,
                lastExercise,
                userExercises,
                loaded,
                setUserExercises,
                setLastExercise,
                handleAddWorkout,
                handleDuplicateWorkout,
                handleDeleteWorkout,
                handleArchiveWorkout,
                handleRenameWorkout,
                handleUpdateWorkoutNote,
                handleUpdateWorkoutOrder,
                handleAddExercise,
                handleDeleteExercise,
                handleArchiveExercise,
                handleUpdateExerciseOrder,
                handleAddLog,
                handleDeleteLog,
                handleCalculateFatiguePercentage,
                getFatigueFeedback,
                handleGetOneRepMaxData,
                handleGetVolumeData,
                handleCreateUserExercise,
                handleDeleteUserExercise,
            }}
        >
            {children}
        </WorkoutContext.Provider>
    )
}

export function useWorkout() {
    const context = useContext(WorkoutContext)
    if (!context) {
        throw new Error('useWorkout must be used within an WorkoutProvider')
    }
    return context
}
