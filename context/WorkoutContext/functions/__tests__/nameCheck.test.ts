import type { Workout } from '../../types'
import { isWorkoutNameTaken } from '../nameCheck'

// Minimal Workout row — only id/name/archived are read by the predicate.
function w(id: string, name: string, archived = false): Workout {
    return { id, userID: 'u', name, order: 0, archived, note: '', createdAt: new Date(), updatedAt: new Date() }
}

describe('isWorkoutNameTaken', () => {
    const workouts = [w('w1', 'Push'), w('w2', 'Pull Day'), w('w3', 'Legs', true)]

    it('matches case-insensitively and trims (add flow: no excludeId)', () => {
        expect(isWorkoutNameTaken(workouts, 'push')).toBe(true)
        expect(isWorkoutNameTaken(workouts, '  PUSH  ')).toBe(true)
        expect(isWorkoutNameTaken(workouts, 'Pull Day')).toBe(true)
    })

    it('ignores archived workouts', () => {
        expect(isWorkoutNameTaken(workouts, 'Legs')).toBe(false)
    })

    it('returns false for a genuinely new name', () => {
        expect(isWorkoutNameTaken(workouts, 'Upper')).toBe(false)
    })

    it('excludes the renamed workout itself but still catches OTHER active workouts (rename flow)', () => {
        // Keeping its own name is allowed...
        expect(isWorkoutNameTaken(workouts, 'Push', 'w1')).toBe(false)
        // ...but colliding with a different active workout is still "taken".
        expect(isWorkoutNameTaken(workouts, 'Pull Day', 'w1')).toBe(true)
    })

    it('reproduces the inline ADD predicate verbatim (undefined excludeId never excludes a row)', () => {
        const target = 'push'
        const inline = workouts.some((x) => !x.archived && x.name.trim().toLowerCase() === target)
        expect(isWorkoutNameTaken(workouts, 'Push')).toBe(inline)
    })

    it('reproduces the inline RENAME predicate verbatim (w.id !== workoutId)', () => {
        const trimmed = 'Pull Day'
        const workoutId = 'w1'
        const inline = workouts.some((x) => !x.archived && x.id !== workoutId && x.name.trim().toLowerCase() === trimmed.toLowerCase())
        expect(isWorkoutNameTaken(workouts, trimmed, workoutId)).toBe(inline)
    })
})
