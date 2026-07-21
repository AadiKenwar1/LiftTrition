import type { Exercise, Log } from '../types'

// Estimate 1RM from weight and reps using the Epley formula.
// When reps === 1, the load itself is the 1RM — no rep multiplier applied.
export function estimate1RM(weight: number, reps: number): number {
    if (!weight || !reps || weight <= 0 || reps <= 0) {
        return 0
    }
    if (reps === 1) {
        return weight
    }
    return weight * (1 + 0.0333 * reps)
}

/**
 * "1RM map": exercise *name* -> max Epley e1RM over valid sets whose log.date falls within the last `refDays`.
 * Same keying idea as the 1RM chart: all Exercise rows with the same name share one bucket.
 *
 * A name may be missing when there are no qualifying sets in-window (sparse training, renames, id gaps).
 * Fatigue still scores recent sets and uses per-set estimate1RM as fallback.
 */
export function oneRMMap(exercises: Exercise[], logs: Log[], refDays: number): Map<string, number> {
    // Normalize the cutoff to local start-of-day using -(refDays - 1) so the boundary
    // day is deterministically included/excluded regardless of wall-clock call time,
    // preserving the refDays-day window (day 0 through day refDays-1 ago).
    const refCutoff = new Date()
    refCutoff.setDate(refCutoff.getDate() - (refDays - 1))
    refCutoff.setHours(0, 0, 0, 0)

    const idToName = new Map<string, string>()
    for (const e of exercises) {
        idToName.set(e.id, e.name)
    }

    const map = new Map<string, number>()
    for (const log of logs) {
        if (log.reps <= 0 || log.weight <= 0) continue
        if (log.date < refCutoff) continue

        const name = idToName.get(log.exerciseID)
        if (!name) continue

        const e1 = estimate1RM(log.weight, log.reps)
        if (e1 <= 0) continue

        const prev = map.get(name) ?? 0
        if (e1 > prev) map.set(name, e1)
    }
    return map
}
