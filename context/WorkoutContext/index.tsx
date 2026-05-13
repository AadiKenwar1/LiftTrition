import { useAuth } from '@/context/AuthContext'
import { convertExerciseLibraryToList, exerciseLib } from '@/context/WorkoutContext/exerciseLibrary'
import { powerSync } from '@/lib/powersync/system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadWorkoutData, saveWorkoutData } from './database/powersyncStore'
import { createUserExercise, deleteUserExercise } from './functions/createExerciseFunctions'
import { addExercise, archiveExercise, deleteExercise, updateExerciseOrder } from './functions/exerciseFunctions'
import { calculateFatiguePercentage, calculateFatigueSummary, getFatigueFeedback } from './functions/fatigueFunctions'
import { getOneRepMaxData } from './functions/graphFunctions'
import { addLog, deleteLog } from './functions/logFunctions'
import { getSetsData } from './functions/volumeFunctions'
import { addWorkout, archiveWorkout, deleteWorkout, duplicateWorkout, renameWorkout, updateWorkoutNote, updateWorkoutOrder } from './functions/workoutFunctions'
import { CreateExerciseData, Exercise, ExerciseLib, Log, Workout, WorkoutContextInterface } from './types'

const WorkoutContext = createContext<WorkoutContextInterface | undefined>(undefined)

export const WorkoutProvider = ({ children }: PropsWithChildren) => {
    const [workouts, setWorkoutsState] = useState<Workout[]>([])
    const [exercises, setExercisesState] = useState<Exercise[]>([])
    const [logs, setLogsState] = useState<Log[]>([])
    const [userExercises, setUserExercisesState] = useState<ExerciseLib>({})
    const [fullExerciseLib, setFullExerciseLib] = useState<ExerciseLib>(exerciseLib)
    const [lastExercise, setLastExercise] = useState<string>('')
    const [loaded, setLoaded] = useState(false)
    const [hasLoadedUserData, setHasLoadedUserData] = useState(false)
    const [persistDirty, setPersistDirty] = useState(false)
    const [persistRetryNonce, setPersistRetryNonce] = useState(0)
    const persistSavingRef = useRef(false)
    const persistDirtyDuringSaveRef = useRef(false)

    const markWorkoutPersistDirty = useCallback(() => {
        if (persistSavingRef.current) {
            persistDirtyDuringSaveRef.current = true
        } else {
            setPersistDirty(true)
        }
    }, [])

    const setUserExercises = useCallback(
        (next: ExerciseLib) => {
            markWorkoutPersistDirty()
            setUserExercisesState(next)
        },
        [markWorkoutPersistDirty],
    )

    const { userID } = useAuth()

    //Wrapper Functions
    const handleAddWorkout = (name: string, userId: string) => {
        markWorkoutPersistDirty()
        addWorkout(name, userId, setWorkoutsState)
    }
    const handleDuplicateWorkout = (id: string) => {
        if (!userID) return
        markWorkoutPersistDirty()
        duplicateWorkout(id, userID, setWorkoutsState, setExercisesState)
    }
    const handleDeleteWorkout = async (id: string) => {
        deleteWorkout(id, setWorkoutsState, setExercisesState, setLogsState)
        // Local PowerSync has no FK CASCADE — delete children first so orphans are not
        // reloaded from SQLite (ghost logs / fatigue after app restart).
        if (userID) {
            try {
                await powerSync.writeTransaction(async (tx) => {
                    await tx.execute('DELETE FROM logs WHERE workout_id = ?', [id])
                    await tx.execute('DELETE FROM exercises WHERE workout_id = ?', [id])
                    await tx.execute('DELETE FROM workouts WHERE id = ?', [id])
                })
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete workout from PowerSync', e)
            }
        }
    }
    const handleArchiveWorkout = (id: string, archived: boolean) => {
        markWorkoutPersistDirty()
        archiveWorkout(id, archived, setWorkoutsState)
    }
    const handleRenameWorkout = (id: string, name: string) => {
        markWorkoutPersistDirty()
        renameWorkout(id, name, setWorkoutsState)
    }
    const handleUpdateWorkoutNote = (id: string, note: string) => {
        markWorkoutPersistDirty()
        updateWorkoutNote(id, note, setWorkoutsState)
    }
    const handleUpdateWorkoutOrder = (reorderedWorkouts: Workout[]) => {
        markWorkoutPersistDirty()
        updateWorkoutOrder(reorderedWorkouts, setWorkoutsState)
    }
    const handleAddExercise = (workoutID: string, userIDParam: string, name: string) => {
        markWorkoutPersistDirty()
        addExercise(workoutID, userIDParam, name, setExercisesState)
    }
    const handleDeleteExercise = async (id: string) => {
        deleteExercise(id, setExercisesState, setLogsState)
        if (userID) {
            try {
                await powerSync.writeTransaction(async (tx) => {
                    await tx.execute('DELETE FROM logs WHERE exercise_id = ?', [id])
                    await tx.execute('DELETE FROM exercises WHERE id = ?', [id])
                })
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete exercise from PowerSync', e)
            }
        }
    }
    const handleArchiveExercise = (id: string, workoutID: string, archived: boolean) => {
        markWorkoutPersistDirty()
        archiveExercise(id, workoutID, archived, setExercisesState)
    }
    const handleUpdateExerciseOrder = (workoutID: string, reorderedExercises: Exercise[]) => {
        markWorkoutPersistDirty()
        updateExerciseOrder(workoutID, reorderedExercises, setExercisesState)
    }
    const handleAddLog = (workoutID: string, exerciseID: string, userIDParam: string, weight: number, reps: number, rpe: number, date: Date) => {
        markWorkoutPersistDirty()
        addLog(workoutID, exerciseID, userIDParam, weight, reps, rpe, date, setLogsState)
    }
    const handleDeleteLog = async (id: string) => {
        deleteLog(id, setLogsState)
        // Delete from PowerSync
        if (userID) {
            try {
                await powerSync.execute('DELETE FROM logs WHERE id = ?', [id])
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete log from PowerSync', e)
            }
        }
    }
    const handleCalculateFatiguePercentage = (numDays: number, activityLevel: string, refByName?: Map<string, number>) =>
        calculateFatiguePercentage(numDays, logs, exercises, fullExerciseLib, activityLevel, refByName)
    const handleGetFatigueSummary = (activityLevel: string, refByName?: Map<string, number>) =>
        calculateFatigueSummary(logs, exercises, fullExerciseLib, activityLevel, refByName)
    const handleGetOneRepMaxData = (exerciseName: string) => getOneRepMaxData(exerciseName, exercises, logs)
    const handleGetSetsData = (onboardingCompletedAt?: Date) => getSetsData(logs, onboardingCompletedAt)
    const handleCreateUserExercise = (exerciseData: CreateExerciseData, userIDParam: string) => {
        markWorkoutPersistDirty()
        createUserExercise(exerciseData, userIDParam, setUserExercisesState)
    }
    const handleDeleteUserExercise = async (exerciseName: string) => {
        deleteUserExercise(exerciseName, setUserExercisesState)
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
            setWorkoutsState([])
            setExercisesState([])
            setLogsState([])
            setUserExercisesState({})
            setLoaded(true)
            setHasLoadedUserData(false)
            setPersistDirty(false)
            return
        }

        setLoaded(false)
        setHasLoadedUserData(false)
        setPersistDirty(false)

        const loadData = async () => {
            try {
                // Wait for PowerSync to sync before loading data
                await powerSync.waitForFirstSync()
                const { workouts, exercises, logs, userExercises, hasData } = await loadWorkoutData(userID)
                setWorkoutsState(workouts)
                setExercisesState(exercises)
                setLogsState(logs)
                setUserExercisesState(userExercises)
                setHasLoadedUserData(hasData)
                setLoaded(true)
            } catch (e) {
                console.warn('[WorkoutContext] Failed to load workout data from PowerSync', e)
                setWorkoutsState([])
                setExercisesState([])
                setLogsState([])
                setUserExercisesState({})
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

    // Save to PowerSync only after real mutations (persistDirty), not after cold-load hydration.
    useEffect(() => {
        if (!loaded || !userID || !hasLoadedUserData || !persistDirty) return
        if (persistSavingRef.current) return

        let cancelled = false
        persistSavingRef.current = true
        void (async () => {
            try {
                await saveWorkoutData(userID, workouts, exercises, logs, userExercises)
                if (cancelled) return
                if (persistDirtyDuringSaveRef.current) {
                    persistDirtyDuringSaveRef.current = false
                    persistSavingRef.current = false
                    setPersistDirty(true)
                    return
                }
                setPersistDirty(false)
            } catch {
                if (!cancelled) setPersistRetryNonce((n) => n + 1)
            } finally {
                if (!cancelled) persistSavingRef.current = false
            }
        })()
        return () => {
            cancelled = true
        }
    }, [workouts, exercises, logs, userExercises, loaded, userID, hasLoadedUserData, persistDirty, persistRetryNonce])

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
                handleGetFatigueSummary,
                getFatigueFeedback,
                handleGetOneRepMaxData,
                handleGetSetsData,
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
