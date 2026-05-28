import { useAuth } from '@/context/AuthContext'
import { convertExerciseLibraryToList, exerciseLib } from '@/context/WorkoutContext/exerciseLibrary'
import { powerSync } from '@/lib/powersync/system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import uuid from 'react-native-uuid'
import {
    insertDuplicateWorkout,
    insertExerciseWithOrderBump,
    insertLog,
    insertWorkoutWithOrderBump,
    loadWorkoutData,
    updateExerciseOrders,
    updateWorkoutOrders,
    upsertExercise,
    upsertUserExercise,
    upsertWorkout,
} from './database/powersyncStore'
import { deleteUserExercise } from './functions/createExerciseFunctions'
import { deleteExercise } from './functions/exerciseFunctions'
import { calculateFatigueFactor, calculateFatiguePercentage, calculateFatigueSummary, getFatigueFeedback } from './functions/fatigueFunctions'
import { getOneRepMaxData } from './functions/graphFunctions'
import { deleteLog as deleteLogFromState } from './functions/logFunctions'
import { validateLog } from './functions/validator'
import { getSetsData } from './functions/volumeFunctions'
import { deleteWorkout } from './functions/workoutFunctions'
import { CreateExerciseData, Exercise, ExerciseLib, ExerciseLibraryEntry, Log, Workout, WorkoutContextInterface } from './types'

const WorkoutContext = createContext<WorkoutContextInterface | undefined>(undefined)

export const WorkoutProvider = ({ children }: PropsWithChildren) => {
    const [workouts, setWorkoutsState] = useState<Workout[]>([])
    const [exercises, setExercisesState] = useState<Exercise[]>([])
    const [logs, setLogsState] = useState<Log[]>([])
    const [userExercises, setUserExercisesState] = useState<ExerciseLib>({})
    const [fullExerciseLib, setFullExerciseLib] = useState<ExerciseLib>(exerciseLib)
    const [lastExercise, setLastExercise] = useState<string>('')
    const [loaded, setLoaded] = useState(false)

    const { userID } = useAuth()

    // ------------------------------------------------------------------
    // Workout handlers
    // ------------------------------------------------------------------

    const handleAddWorkout = useCallback(async (name: string, userId: string) => {
        const now = new Date()
        const newWorkout: Workout = {
            id: uuid.v4() as string,
            userID: userId,
            name,
            order: 0,
            archived: false,
            note: '',
            createdAt: now,
            updatedAt: now,
        }
        setWorkoutsState(prev => [
            ...prev.map(w => ({ ...w, order: w.order + 1, updatedAt: now })),
            newWorkout,
        ])
        try {
            await insertWorkoutWithOrderBump(newWorkout)
        } catch (e) {
            console.warn('[WorkoutContext] Failed to insert workout', e)
        }
    }, [])

    const handleDuplicateWorkout = useCallback(async (id: string) => {
        if (!userID) return
        const source = workouts.find(w => w.id === id)
        if (!source) return

        const now = new Date()
        const newWorkoutId = uuid.v4() as string

        const newWorkout: Workout = {
            id: newWorkoutId,
            userID,
            name: `${source.name} (Copy)`,
            order: 0,
            archived: false,
            note: source.note,
            createdAt: now,
            updatedAt: now,
        }

        const newExercises: Exercise[] = exercises
            .filter(e => e.workoutID === id && !e.archived)
            .sort((a, b) => a.order - b.order)
            .map((ex, index) => ({
                id: uuid.v4() as string,
                userID,
                workoutID: newWorkoutId,
                name: ex.name,
                userMax: ex.userMax,
                order: index,
                archived: false,
                createdAt: now,
                updatedAt: now,
            }))

        setWorkoutsState(prev => [
            ...prev.map(w => ({ ...w, order: w.order + 1, updatedAt: now })),
            newWorkout,
        ])
        setExercisesState(prev => [...prev, ...newExercises])

        try {
            await insertDuplicateWorkout(newWorkout, newExercises)
        } catch (e) {
            console.warn('[WorkoutContext] Failed to duplicate workout', e)
        }
    }, [userID, workouts, exercises])

    const handleDeleteWorkout = useCallback(async (id: string) => {
        deleteWorkout(id, setWorkoutsState, setExercisesState, setLogsState)
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
    }, [userID])

    const handleArchiveWorkout = useCallback(async (id: string, archived: boolean) => {
        const now = new Date()
        if (archived) {
            // Currently archived → unarchiving: place at order 0, bump all active siblings
            setWorkoutsState(prev => prev.map(w => {
                if (w.id === id) return { ...w, archived: false, order: 0, updatedAt: now }
                if (!w.archived) return { ...w, order: w.order + 1, updatedAt: now }
                return w
            }))
            if (userID) {
                try {
                    await powerSync.writeTransaction(async (tx) => {
                        await tx.execute(
                            `UPDATE workouts SET "order" = "order" + 1, updated_at = datetime('now') WHERE user_id = ? AND archived = 0`,
                            [userID]
                        )
                        await tx.execute(
                            `UPDATE workouts SET archived = 0, "order" = 0, updated_at = datetime('now') WHERE id = ?`,
                            [id]
                        )
                    })
                } catch (e) {
                    console.warn('[WorkoutContext] Failed to unarchive workout', e)
                }
            }
        } else {
            // Currently active → archiving: place at top of archived list, bump other archived
            setWorkoutsState(prev => prev.map(w => {
                if (w.id === id) return { ...w, archived: true, order: 0, updatedAt: now }
                if (w.archived) return { ...w, order: w.order + 1, updatedAt: now }
                return w
            }))
            if (userID) {
                try {
                    await powerSync.writeTransaction(async (tx) => {
                        await tx.execute(
                            `UPDATE workouts SET "order" = "order" + 1, updated_at = datetime('now') WHERE user_id = ? AND archived = 1 AND id != ?`,
                            [userID, id]
                        )
                        await tx.execute(
                            `UPDATE workouts SET archived = 1, "order" = 0, updated_at = datetime('now') WHERE id = ?`,
                            [id]
                        )
                    })
                } catch (e) {
                    console.warn('[WorkoutContext] Failed to archive workout', e)
                }
            }
        }
    }, [userID])

    const handleRenameWorkout = useCallback(async (id: string, name: string) => {
        const now = new Date()
        let updated: Workout | undefined
        setWorkoutsState(prev => prev.map(w => {
            if (w.id !== id) return w
            updated = { ...w, name, updatedAt: now }
            return updated
        }))
        if (updated) {
            try {
                await upsertWorkout(updated)
            } catch (e) {
                console.warn('[WorkoutContext] Failed to rename workout', e)
            }
        }
    }, [])

    const handleUpdateWorkoutNote = useCallback(async (id: string, note: string) => {
        const now = new Date()
        let updated: Workout | undefined
        setWorkoutsState(prev => prev.map(w => {
            if (w.id !== id) return w
            updated = { ...w, note, updatedAt: now }
            return updated
        }))
        if (updated) {
            try {
                await upsertWorkout(updated)
            } catch (e) {
                console.warn('[WorkoutContext] Failed to update workout note', e)
            }
        }
    }, [])

    const handleUpdateWorkoutOrder = useCallback(async (reorderedWorkouts: Workout[]) => {
        const now = new Date()
        const withOrder = reorderedWorkouts.map((w, i) => ({ ...w, order: i, updatedAt: now }))
        setWorkoutsState(prev => prev.map(w => {
            const updated = withOrder.find(u => u.id === w.id)
            return updated ?? w
        }))
        try {
            await updateWorkoutOrders(withOrder)
        } catch (e) {
            console.warn('[WorkoutContext] Failed to update workout order', e)
        }
    }, [])

    // ------------------------------------------------------------------
    // Exercise handlers
    // ------------------------------------------------------------------

    const handleAddExercise = useCallback(async (workoutID: string, userIDParam: string, name: string) => {
        const now = new Date()
        const newExercise: Exercise = {
            id: uuid.v4() as string,
            userID: userIDParam,
            workoutID,
            name,
            userMax: 0,
            order: 0,
            archived: false,
            createdAt: now,
            updatedAt: now,
        }
        setExercisesState(prev => [
            ...prev.map(e => e.workoutID === workoutID ? { ...e, order: e.order + 1, updatedAt: now } : e),
            newExercise,
        ])
        try {
            await insertExerciseWithOrderBump(newExercise)
        } catch (e) {
            console.warn('[WorkoutContext] Failed to insert exercise', e)
        }
    }, [])

    const handleDeleteExercise = useCallback(async (id: string) => {
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
    }, [userID])

    const handleArchiveExercise = useCallback(async (id: string, workoutID: string, archived: boolean) => {
        const now = new Date()
        if (archived) {
            // Currently archived → unarchiving: place at order 0, bump active siblings
            setExercisesState(prev => prev.map(e => {
                if (e.id === id) return { ...e, archived: false, order: 0, updatedAt: now }
                if (e.workoutID === workoutID && !e.archived) return { ...e, order: e.order + 1, updatedAt: now }
                return e
            }))
            if (userID) {
                try {
                    await powerSync.writeTransaction(async (tx) => {
                        await tx.execute(
                            `UPDATE exercises SET "order" = "order" + 1, updated_at = datetime('now') WHERE workout_id = ? AND archived = 0`,
                            [workoutID]
                        )
                        await tx.execute(
                            `UPDATE exercises SET archived = 0, "order" = 0, updated_at = datetime('now') WHERE id = ?`,
                            [id]
                        )
                    })
                } catch (e) {
                    console.warn('[WorkoutContext] Failed to unarchive exercise', e)
                }
            }
        } else {
            // Currently active → archiving: place at top of archived list, bump other archived in workout
            setExercisesState(prev => prev.map(e => {
                if (e.id === id) return { ...e, archived: true, order: 0, updatedAt: now }
                if (e.workoutID === workoutID && e.archived) return { ...e, order: e.order + 1, updatedAt: now }
                return e
            }))
            if (userID) {
                try {
                    await powerSync.writeTransaction(async (tx) => {
                        await tx.execute(
                            `UPDATE exercises SET "order" = "order" + 1, updated_at = datetime('now') WHERE workout_id = ? AND archived = 1 AND id != ?`,
                            [workoutID, id]
                        )
                        await tx.execute(
                            `UPDATE exercises SET archived = 1, "order" = 0, updated_at = datetime('now') WHERE id = ?`,
                            [id]
                        )
                    })
                } catch (e) {
                    console.warn('[WorkoutContext] Failed to archive exercise', e)
                }
            }
        }
    }, [userID])

    const handleUpdateExerciseOrder = useCallback(async (workoutID: string, reorderedExercises: Exercise[]) => {
        const now = new Date()
        const withOrder = reorderedExercises.map((e, i) => ({ ...e, order: i, updatedAt: now }))
        setExercisesState(prev => prev.map(e => {
            if (e.workoutID !== workoutID) return e
            const updated = withOrder.find(u => u.id === e.id)
            return updated ?? e
        }))
        try {
            await updateExerciseOrders(withOrder)
        } catch (e) {
            console.warn('[WorkoutContext] Failed to update exercise order', e)
        }
    }, [])

    // ------------------------------------------------------------------
    // Log handlers
    // ------------------------------------------------------------------

    const handleAddLog = useCallback(async (
        workoutID: string,
        exerciseID: string,
        userIDParam: string,
        weight: number,
        reps: number,
        rpe: number,
        date: Date,
    ) => {
        if (!validateLog(weight, reps, rpe)) return
        const now = new Date()
        const newLog: Log = {
            id: uuid.v4() as string,
            userID: userIDParam,
            workoutID,
            exerciseID,
            date,
            time: Date.now(),
            weight,
            reps,
            rpe,
            createdAt: now,
            updatedAt: now,
        }
        setLogsState(prev => [...prev, newLog])
        try {
            await insertLog(newLog)
        } catch (e) {
            console.warn('[WorkoutContext] Failed to insert log', e)
        }
    }, [])

    const handleDeleteLog = useCallback(async (id: string) => {
        deleteLogFromState(id, setLogsState)
        if (userID) {
            try {
                await powerSync.execute('DELETE FROM logs WHERE id = ?', [id])
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete log from PowerSync', e)
            }
        }
    }, [userID])

    // ------------------------------------------------------------------
    // User exercise handlers
    // ------------------------------------------------------------------

    const handleCreateUserExercise = useCallback(async (exerciseData: CreateExerciseData, userIDParam: string) => {
        const { name, mainMuscle, isCompound, equipment } = exerciseData
        const fatigueFactor = calculateFatigueFactor(isCompound, mainMuscle, equipment)
        const newEntry: ExerciseLibraryEntry = { mainMuscle, fatigueFactor, equipment, isCompound }
        setUserExercisesState(prev => ({ ...prev, [name]: newEntry }))
        try {
            await upsertUserExercise(userIDParam, name, newEntry)
        } catch (e) {
            console.warn('[WorkoutContext] Failed to upsert user exercise', e)
        }
    }, [])

    const handleDeleteUserExercise = useCallback(async (exerciseName: string) => {
        deleteUserExercise(exerciseName, setUserExercisesState)
        if (userID) {
            try {
                await powerSync.execute('DELETE FROM user_exercises WHERE user_id = ? AND name = ?', [userID, exerciseName])
            } catch (e) {
                console.warn('[WorkoutContext] Failed to delete user exercise from PowerSync', e)
            }
        }
    }, [userID])

    // Simple pass-through exposed for any external bulk-set needs (e.g. initial hydration overrides)
    const setUserExercises = useCallback((next: ExerciseLib) => {
        setUserExercisesState(next)
    }, [])

    // ------------------------------------------------------------------
    // Read-only computation handlers
    // ------------------------------------------------------------------

    const handleCalculateFatiguePercentage = useCallback(
        (numDays: number, activityLevel: string, currentBodyWeight: number, bwProgress: Record<string, number>) =>
            calculateFatiguePercentage(numDays, logs, exercises, fullExerciseLib, activityLevel, currentBodyWeight, bwProgress),
        [logs, exercises, fullExerciseLib]
    )

    const handleGetFatigueSummary = useCallback(
        (activityLevel: string, currentBodyWeight: number, bwProgress: Record<string, number>) =>
            calculateFatigueSummary(logs, exercises, fullExerciseLib, activityLevel, currentBodyWeight, bwProgress),
        [logs, exercises, fullExerciseLib]
    )

    const handleGetOneRepMaxData = useCallback(
        (exerciseName: string) => getOneRepMaxData(exerciseName, exercises, logs),
        [exercises, logs]
    )

    const handleGetSetsData = useCallback(
        (onboardingCompletedAt?: Date) => getSetsData(logs, onboardingCompletedAt),
        [logs]
    )

    // ------------------------------------------------------------------
    // Effects
    // ------------------------------------------------------------------

    // Merge base library with user exercises whenever userExercises changes
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

    // Load from PowerSync when user changes
    useEffect(() => {
        if (!userID) {
            setWorkoutsState([])
            setExercisesState([])
            setLogsState([])
            setUserExercisesState({})
            setLoaded(true)
            return
        }

        setLoaded(false)

        const loadData = async () => {
            try {
                await powerSync.waitForFirstSync()
                const { workouts: w, exercises: e, logs: l, userExercises: u } = await loadWorkoutData(userID)
                setWorkoutsState(w)
                setExercisesState(e)
                setLogsState(l)
                setUserExercisesState(u)
                setLoaded(true)
            } catch (e) {
                console.warn('[WorkoutContext] Failed to load workout data from PowerSync', e)
                setWorkoutsState([])
                setExercisesState([])
                setLogsState([])
                setUserExercisesState({})
                setLoaded(true)
            }
        }

        loadData()
    }, [userID])

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
