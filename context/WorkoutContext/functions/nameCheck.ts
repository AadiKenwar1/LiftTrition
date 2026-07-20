import { Workout } from '../types'

// True when an active (non-archived) workout already uses this name, case-insensitively and trimmed; excludeId skips the row being renamed (add passes none). Single owner of the duplicate-name rule shared by addWorkoutModal and renameModal.
export function isWorkoutNameTaken(workouts: Workout[], name: string, excludeId?: string): boolean {
    const target = name.trim().toLowerCase()
    return workouts.some((w) => !w.archived && w.id !== excludeId && w.name.trim().toLowerCase() === target)
}
