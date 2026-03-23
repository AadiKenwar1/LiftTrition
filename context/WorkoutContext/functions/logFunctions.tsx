import { Dispatch, SetStateAction } from 'react'
import uuid from 'react-native-uuid'
import { Log } from '../types'
import { validateLog } from './validator'

//Adds a new log to the list
export function addLog(workoutID: string, exerciseID: string, userID: string, weight: number, reps: number, rpe: number, date: Date, setLogs: Dispatch<SetStateAction<Log[]>>) {
    if (!validateLog(weight, reps, rpe)) return

    const newLog: Log = {
        id: uuid.v4(),
        userID: userID,
        workoutID: workoutID,
        exerciseID: exerciseID,
        date: date,
        weight: weight,
        reps: reps,
        rpe: rpe,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
    setLogs((prev) => [...prev, newLog])
}

//Deletes a log from the list
export function deleteLog(id: string, setLogs: Dispatch<SetStateAction<Log[]>>) {
    setLogs((prev) => prev.filter((log) => log.id !== id))
}
