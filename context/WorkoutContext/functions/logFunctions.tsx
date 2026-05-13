import { Dispatch, SetStateAction } from 'react'
import uuid from 'react-native-uuid'
import { Log } from '../types'
import { validateLog } from './validator'

// Adds a new log; returns it so the caller can persist it, or null if validation fails.
export function addLog(
    workoutID: string,
    exerciseID: string,
    userID: string,
    weight: number,
    reps: number,
    rpe: number,
    date: Date,
    setLogs: Dispatch<SetStateAction<Log[]>>
): Log | null {
    if (!validateLog(weight, reps, rpe)) return null;

    const newLog: Log = {
        id: uuid.v4(),
        userID,
        workoutID,
        exerciseID,
        date,
        time: Date.now(),
        weight,
        reps,
        rpe,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    setLogs(prev => [...prev, newLog]);
    return newLog;
}

// Deletes a log from state only.
export function deleteLog(id: string, setLogs: Dispatch<SetStateAction<Log[]>>): void {
    setLogs(prev => prev.filter(l => l.id !== id));
}
