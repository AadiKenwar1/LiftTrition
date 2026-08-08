import { calculateAge } from '@/lib/utils/dateHelper'
import { lbsToKg } from '@/lib/utils/unitConversions'
import { Settings } from '../types'

// ───────────────────────────── Tunables ─────────────────────────────

//Daily calorie minimums (Harvard Health). The app's only adequacy rule, and it is advisory: nothing clamps
//to these, every computed target is stated raw, and belowCalorieMinimum is what the warning surfaces read.
export const LOW_CALORIE_THRESHOLDS = { male: 1500, female: 1200 } as const

//Absolute pace ceiling in lb/week — no goal, however large the body, gets a faster slider.
export const PACE_CEILING = 2

//Percentage-of-calories macro presets, one per goal type; splitMacros consumes them.
const MACRO_PRESETS = { lose: { protein: 0.30, fat: 0.30, carbs: 0.40 }, maintain: { protein: 0.25, fat: 0.30, carbs: 0.45 }, gain: { protein: 0.25, fat: 0.25, carbs: 0.50 } } as const

// ──────────────────────── Maintenance (the shared input) ────────────────────────
// Everything below reads maintenanceCalories: the target/pace family adjusts it by goalPace,
// the macro family splits the resulting target.

//Whole-day activity multipliers for TDEE (Mifflin-St Jeor flow).
function getActivityFactor(activityLevel: Settings['activityLevel']): number {
    const factorMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, gymrat: 1.9 }
    return factorMap[activityLevel]
}

//Mifflin-St Jeor BMR × activity factor, returned raw and unrounded — callers decide their own flooring. Maintain anchors to goalWeight (fallback bodyWeight when <= 0) so weigh-ins never move a maintain user's targets.
function maintenanceCalories(settings: Settings, isImperial: boolean): number {
    const weightForTargets = settings.goalType === 'maintain' && settings.goalWeight > 0 ? settings.goalWeight : settings.bodyWeight
    let weightKg = weightForTargets
    let heightCm = settings.height
    const age = calculateAge(settings.birthDate)

    if (isImperial) {
        weightKg = weightForTargets / 2.20462
        heightCm = settings.height * 2.54
    }

    const BMR = settings.gender === 'male' ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5 : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    return BMR * getActivityFactor(settings.activityLevel)
}

// ──────────────────── Calorie target & pace family ────────────────────
// Two views of the same deficit arithmetic (500 kcal/day ≈ 1 lb/week):
// calculateCalorieTarget turns a pace into a target, derivedPace turns a
// target back into a pace.

//Maintenance (raw, never floored) plus the goal-adjusted target, rounded for the INTEGER calorie_goal column. No adequacy clamp on any branch — an aggressive pace is stated honestly and warned about at the surface, so the slider never silently stops moving. The 1 kcal fence stays because degenerate validator-legal bodies drive the BMR negative and GraphStats divides by the goal.
export function calculateCalorieTarget(settings: Settings, isImperial: boolean): { maintenance: number; target: number } {
    const maintenance = maintenanceCalories(settings, isImperial)
    const dailyAdjustment = (settings.goalPace * 3500) / 7
    const delta = settings.goalType === 'lose' ? -dailyAdjustment : settings.goalType === 'gain' ? dailyAdjustment : 0
    return { maintenance, target: Math.max(1, Math.round(maintenance + delta)) }
}

//True when a target sits under this body's stated daily minimum. The single home for the rule, so the four warning surfaces can't drift on the boundary or the gender lookup; strictly less-than, so a target landing exactly on the line reads as fine.
export function belowCalorieMinimum(calories: number, gender: Settings['gender']): boolean {
    return calories < LOW_CALORIE_THRESHOLDS[gender]
}

//The lb/week pace a calorie target actually delivers against maintenance, clamped at 0 so callers render "—" instead of feeding weeksToGoal's pace > 0 fallback a fabricated date. Metric displays convert the result with lbsToKg at the caller.
export function derivedPace(maintenance: number, calorieGoal: number, goalType: Settings['goalType']): number {
    if (goalType === 'lose') return Math.max(0, (maintenance - calorieGoal) / 500)
    if (goalType === 'gain') return Math.max(0, (calorieGoal - maintenance) / 500)
    return 0
}

//True when a target points the wrong way for the goal — at or above maintenance on a cut, at or below it on a bulk. Checks the same post-lbsToKg display pace projectGoal guards on, not the raw lb one, so a metric plan whose real-but-sub-0.1kg pace rounds to 0.0 still warns instead of silently disagreeing with the "—" the projection renders; maintain is never wrong, eating at maintenance being the goal.
export function wontReachGoal(calories: number, maintenance: number, goalType: Settings['goalType'], unitSystem: Settings['unitSystem']): boolean {
    if (goalType === 'maintain') return false
    const pace = derivedPace(maintenance, calories, goalType)
    return (unitSystem === 'metric' ? lbsToKg(pace) : pace) === 0
}

// ──────────────────────── Macro split family ────────────────────────
// splitMacros divides an already-decided target into grams; calculateMacros is the
// screen entry point that asks calculateCalorieTarget for the target and splits it.

//The goal-preset percentage split over an already-decided calorie target; grams rounded to integers and floored at 1 so a degenerate target can never render a 0g macro row.
export function splitMacros(goalType: Settings['goalType'], calories: number) {
    const preset = MACRO_PRESETS[goalType]
    return {
        proteinGrams: Math.max(1, Math.round((calories * preset.protein) / 4)),
        fatGrams: Math.max(1, Math.round((calories * preset.fat) / 9)),
        carbGrams: Math.max(1, Math.round((calories * preset.carbs) / 4)),
    }
}

//The full pass the screens run: calculateCalorieTarget for the number, then the percentage split over it. It delegates rather than re-deriving the same adjustment arithmetic, so the pace slider's live readout and the plan screen's calorie card are the same function and cannot disagree.
export function calculateMacros(settings: Settings, isImperial: boolean = true) {
    const { target } = calculateCalorieTarget(settings, isImperial)
    return { calResult: target, ...splitMacros(settings.goalType, target) }
}

//True when any of the four goals has been moved off what calculateMacros produced — what the plan screens commit as macrosCustomized, since withRegeneratedTargets spares hand-tuned targets from the next weigh-in and only a real edit should earn that. Rounds the computed side because both screens seed their editable state that way, so a fractional formula output can't read as an edit nobody made.
export function macrosWereEdited(goals: Pick<Settings, 'calorieGoal' | 'proteinGoal' | 'carbsGoal' | 'fatsGoal'>, computed: ReturnType<typeof calculateMacros>): boolean {
    return goals.calorieGoal !== Math.round(computed.calResult) || goals.proteinGoal !== Math.round(computed.proteinGrams) || goals.carbsGoal !== Math.round(computed.carbGrams) || goals.fatsGoal !== Math.round(computed.fatGrams)
}
