import { Dispatch, SetStateAction } from 'react'
import uuid from 'react-native-uuid'
import { Exercise, Log } from '../types'

//Increments the orders of all exercises in a specific workout by 1
export function incrementExerciseOrders(exercises: Exercise[], workoutID: string): Exercise[] {
    return exercises.map((exercise) => (exercise.workoutID === workoutID ? { ...exercise, order: exercise.order + 1, updatedAt: new Date() } : exercise))
}

//Adds a new exercise to the list
export function addExercise(workoutID: string, userID: string, name: string, setExercises: Dispatch<SetStateAction<Exercise[]>>) {
    setExercises((prev) => {
        const incrementedExercises = incrementExerciseOrders(prev, workoutID)

        const newExercise: Exercise = {
            id: uuid.v4(),
            userID: userID,
            workoutID: workoutID,
            name: name,
            userMax: 0,
            order: 0,
            archived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        return [...incrementedExercises, newExercise]
    })
}

export function deleteExercise(id: string, setExercises: Dispatch<SetStateAction<Exercise[]>>, setLogs: Dispatch<SetStateAction<Log[]>>) {
    setExercises((prev) => prev.filter((exercise) => exercise.id !== id))
    setLogs((prev) => prev.filter((log) => log.exerciseID !== id))
}

//Arhives OR Unarchives an exercise based on the boolean parameter
export function archiveExercise(id: string, workoutID: string, archived: boolean, setExercises: Dispatch<SetStateAction<Exercise[]>>) {
    if (archived) {
        setExercises((prev) => {
            return prev.map((exercise) => {
                if (exercise.id === id) {
                    return { ...exercise, archived: false, order: 0, updatedAt: new Date() }
                } else if (exercise.workoutID === workoutID) {
                    return { ...exercise, order: exercise.order + 1, updatedAt: new Date() }
                }
                return exercise
            })
        })
    } else {
        setExercises((prev) => prev.map((exercise) => (exercise.id === id ? { ...exercise, archived: true, updatedAt: new Date() } : exercise)))
    }
}

export function updateExerciseOrder(workoutID: string, reorderedExercises: Exercise[], setExercises: Dispatch<SetStateAction<Exercise[]>>) {
    const updatedExercises = reorderedExercises.map((exercise, index) => ({ ...exercise, order: index, updatedAt: new Date() }))
    setExercises((prev) =>
        prev.map((exercise) => {
            if (exercise.workoutID !== workoutID) {
                return exercise
            }
            const updated = updatedExercises.find((e) => e.id === exercise.id)
            return updated || exercise
        }),
    )
}
