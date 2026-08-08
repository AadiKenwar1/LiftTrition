import type { Settings } from '@/context/SettingsContext/types'

/**
 * The calorie number step 3 opens with, picked on the launcher. projectGoal's states are defined by where
 * the calorie target sits relative to maintenance, and maintenance is a Mifflin-St Jeor number nobody can
 * compute at the card — so reaching "—" by hand means walking four screens and typing a value guessed from
 * the persona's facts line. These place the number for you. Seeding the calories without moving the grams
 * is exactly what a hand-edit does, so the wizard sees the same state either way.
 *
 * Module state rather than a route param: the param would have to be threaded through all four copies and
 * every push site, and the copies are hand-synced against production — the fewer signature deltas the
 * easier they are to diff.
 */

export type CalorieScenario = 'plan' | 'barely' | 'atMaintenance' | 'wrongWay'

// Ordered by distance from an honest plan, so walking the row walks from a normal date to no date at all.
export const CALORIE_SCENARIOS: { key: CalorieScenario; label: string; expect: string }[] = [
    { key: 'plan', label: 'Plan', expect: 'the computed target — a normal date, and the pace the slider implied' },
    { key: 'barely', label: 'Barely moving', expect: '10 kcal from maintenance — a real but enormous week count on lbs; on kg the pace rounds under 0.1 and it reads "—"' },
    { key: 'atMaintenance', label: 'No deficit', expect: 'exactly at maintenance — derived pace 0, so "—" and the wrong-direction line' },
    { key: 'wrongWay', label: 'Wrong way', expect: '200 kcal the wrong side of maintenance — "—" again, from clearly past the line' },
]

let selected: CalorieScenario = 'plan'

// Stores the launcher's pick for the walk that follows.
export function setCalorieScenario(scenario: CalorieScenario): void {
    selected = scenario
}

// The calorie value step 3 seeds: the computed plan, or a number placed against maintenance to force a projection state. Maintain has no pace-derived date, so it always keeps the plan. Ceil/floor rather than round on the no-deficit case because a rounded maintenance can still leave a fraction of a kcal of deficit, which reads as a real (huge) week count instead of the zero being asked for.
export function scenarioCalories(maintenance: number, target: number, goalType: Settings['goalType']): number {
    if (goalType === 'maintain') return target
    const losing = goalType === 'lose'
    switch (selected) {
        case 'barely':
            return Math.round(losing ? maintenance - 10 : maintenance + 10)
        case 'atMaintenance':
            return losing ? Math.ceil(maintenance) : Math.floor(maintenance)
        case 'wrongWay':
            return Math.round(losing ? maintenance + 200 : maintenance - 200)
        default:
            return target
    }
}
