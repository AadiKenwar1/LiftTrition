import { weeksToGoal } from '@/lib/utils/goalMath'
import { lbsToKg } from '@/lib/utils/unitConversions'
import { Settings } from '../types'
import { calculateCalorieTarget, derivedPace } from './macroCalculation'

//Weeks and date from the calorie target in play, never the stored pace: maintain holds 12 weeks, and a lose/gain plan with no deficit returns null/"—" so a derived 0 never reaches weeksToGoal's pace > 0 fallback.
export function projectGoal(settings: Settings, calorieGoal: number): { weeks: number | null; targetDate: string; paceWeight: number } {
    const metric = settings.unitSystem === 'metric'
    const { maintenance } = calculateCalorieTarget(settings, !metric)
    const paceWeight = derivedPace(maintenance, calorieGoal, settings.goalType)
    //weeksToGoal divides in display units, so the lb/week pace converts for a kg body.
    const paceDisplay = metric ? lbsToKg(paceWeight) : paceWeight
    const weeks =
        settings.goalType === 'maintain' ? weeksToGoal('maintain', settings.bodyWeight, settings.goalWeight, paceDisplay)
        : paceDisplay > 0 ? weeksToGoal(settings.goalType, settings.bodyWeight, settings.goalWeight, paceDisplay)
        : null
    return { weeks, targetDate: formatTargetDate(weeks), paceWeight }
}

//Calendar label for the projection's end: today + weeks × 7 days, or "—" when no honest date exists.
function formatTargetDate(weeks: number | null): string {
    if (weeks == null) return '—'
    const d = new Date()
    d.setDate(d.getDate() + weeks * 7)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
