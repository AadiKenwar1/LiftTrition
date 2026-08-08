import { calculateCalorieTarget } from '@/context/SettingsContext/functions/macroCalculation'
import type { Settings } from '@/context/SettingsContext/types'

/**
 * Accuracy prototypes for the paceWizard copies, kept out of macroCalculation.tsx so the production
 * flow keeps computing exactly what it computes today.
 *
 * The chain, in order: maintenance (Mifflin-St Jeor × activity factor, unchanged from production) →
 * basis weight (min of the scale weight and the weight BMI 30 would be at this height) → protein and
 * fat priced per pound of basis by goal → the nutrition floor (exactly their cost) → the pace cap (the
 * fastest cut whose target still pays that bill) → the target → carbs as whatever calories remain,
 * which the cap guarantees is never negative.
 *
 * The order is the design: protein and fat are priced BEFORE the pace is chosen, because what a body
 * costs to feed is what decides how fast it can afford to cut. That one constraint replaces the
 * percentage macro split, the gender calorie minimums, the 800 clamp and the proportional scale-down —
 * a computed plan can never overspend, so no repair pass exists to need. The cap is arithmetic, not
 * opinion: the slider ends exactly where a faster pace would need negative carbs, and every softer
 * line (800 kcal, 130 g of carbs) is a warning in CalorieFeedback, never a stop — the smallest bodies
 * CAN reach sub-800 plans at their cap, and are told so in red.
 *
 * Stored activityLevel keys are unchanged, so nothing here touches AppSchema, sync, or the DB.
 */

// Mirrors getActivityFactor's private map in macroCalculation.tsx, so devMaintenance can divide the shipped
// factor back out. If a retune ever lands there, both maps agree, every ratio becomes 1, and the rescale
// turns into an identity — the failure mode is a no-op rather than a double correction.
const SHIPPED_ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, gymrat: 1.9 } as const

// Deliberately identical to the shipped map, so every ratio is 1, devMaintenance is a pass-through, and the
// wizard copies burn exactly what production burns. The knob remains — change a value here and the burn,
// the pace cap, the target and the projected date all follow it.
export const DEV_ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, gymrat: 1.9 } as const

// Same raw division maintenanceCalories uses — deliberately not lbsToKg, which rounds to one decimal for
// display and would let the basis weight drift from the weight the BMR was computed on.
const LBS_PER_KG = 2.20462

// The advisory line: a warning fires under 130 g of carbohydrate (the brain's glucose requirement), and
// never stops anything — a cut at the cap deliberately runs near zero carbs, keto-style, and stays legal.
export const CARB_WARNING_G = 130

// Both directions of the dev slider stop here. A surplus needs no safety ceiling — adding calories only
// ever adds carbs — so this one is for the interface, not for safety. Matches the shipped PACE_CEILING:
// the cap formula below is what makes the track honest, the ceiling just ends it.
export const DEV_PACE_CEILING = 2

// Both rules are grams per pound of the basis weight, so the whole prescription is two multiplications.
// Protein does not tier by activity — activity is the least reliable input, so it moves only the burn,
// never the macro a cut leans on. Fat runs opposite to protein: lowest on a cut where the budget is
// tightest, highest on a bulk where fat is the cheapest way to add calories back.
export const PROTEIN_G_PER_LB = { lose: 1.1, maintain: 0.9, gain: 0.9 } as const
export const FAT_G_PER_LB = { lose: 0.3, maintain: 0.35, gain: 0.4 } as const

// The BMI the basis weight is ceilinged at. Fat mass carries almost no protein requirement, so per-pound
// rules over-prescribe for a body carrying a lot of it, and the app never learns body composition — height
// stands in for it. 30 is high enough that no natural lifter reaches it, and min() keeps the rule
// continuous: a conditional switch would let one pound of weigh-in noise move the basis by dozens.
const BASIS_BMI_CEILING = 30

/**
 * Maintenance under the dev ladder. The BMR still comes from the shipped calculateCalorieTarget and is
 * rescaled by newFactor / oldFactor, which is exact because maintenance is BMR × factor — re-deriving
 * Mifflin-St Jeor here would put a second copy of the formula in the codebase.
 */
export function devMaintenance(settings: Settings, isImperial: boolean): number {
    const { maintenance } = calculateCalorieTarget(settings, isImperial)
    return maintenance * (DEV_ACTIVITY_FACTORS[settings.activityLevel] / SHIPPED_ACTIVITY_FACTORS[settings.activityLevel])
}

/**
 * The weight the macro rules scale off, in kg: the goal's anchor weight, ceilinged at what BMI 30 weighs at
 * this height. Lose and gain read the scale — a cut defends the lean mass actually there, and the
 * prescription falls with the weigh-ins. Maintain keeps the goal weight, matching maintenanceCalories'
 * weightForTargets exactly, so on a maintain goal the macro basis and the calorie basis stay the same
 * weight; goalWeight <= 0 falls back to bodyWeight, the same legacy guard that function carries.
 */
export function basisWeightKg(settings: Settings, isImperial: boolean): number {
    const anchor = settings.goalType === 'maintain' && settings.goalWeight > 0 ? settings.goalWeight : settings.bodyWeight
    const anchorKg = isImperial ? anchor / LBS_PER_KG : anchor
    const heightM = isImperial ? settings.height * 0.0254 : settings.height / 100
    return Math.min(anchorKg, BASIS_BMI_CEILING * heightM * heightM)
}

// The per-pound rules are exact in pounds but the weight arrives in kg, so the round trip lands a hair
// either side of exact — far enough to send two identical .5 ties opposite ways. Settling the tenth first
// clears that noise, so a tie always rounds up.
function stableGrams(weightKg: number, gPerLb: number): number {
    return Math.round(Math.round(weightKg * LBS_PER_KG * gPerLb * 10) / 10)
}

/**
 * The lowest target this body can be handed without negative carbs: exactly what protein and fat cost at
 * the goal's rates. Not an opinion about adequacy — the arithmetic point past which a plan stops being
 * possible. The pace cap and the floor warning both read this number, so the slider's end and the
 * warning's line can never disagree.
 */
export function devFloorCalories(goalType: Settings['goalType'], weightKg: number): number {
    return stableGrams(weightKg, PROTEIN_G_PER_LB[goalType]) * 4 + stableGrams(weightKg, FAT_G_PER_LB[goalType]) * 9
}

// Shared by devMaxPace and devCalorieTarget so the clamp and the cap are the same arithmetic: the fastest
// lose pace whose target still clears the nutrition floor, floored (never rounded up) to the slider's 0.1
// step and clamped to [0.1, DEV_PACE_CEILING].
function maxPaceFor(settings: Settings, isImperial: boolean): number {
    const spare = devMaintenance(settings, isImperial) - devFloorCalories('lose', basisWeightKg(settings, isImperial))
    const stepped = Math.floor((spare / 500) * 10) / 10
    return Math.min(DEV_PACE_CEILING, Math.max(0.1, stepped))
}

/**
 * The honest lose-slider ceiling; gain and maintain get the bare interface ceiling. Always lb/week — the
 * kg slider converts the result.
 */
export function devMaxPace(settings: Settings): number {
    if (settings.goalType !== 'lose') return DEV_PACE_CEILING
    return maxPaceFor(settings, settings.unitSystem === 'imperial')
}

/**
 * Raw unfloored maintenance plus the goal-adjusted target, rounded for the INTEGER column. A lose pace is
 * clamped to the nutrition-floor cap — target = max(target_at_pace, floor) expressed in the slider's
 * units, so the committed number and the slider's end always agree. No 800 clamp: a small body's cap can
 * honestly land under it, and CalorieFeedback says so in red rather than the target quietly moving. All
 * three goals keep the 1 kcal positive fence so a degenerate body can't hand GraphStats a zero to divide by.
 */
export function devCalorieTarget(settings: Settings, isImperial: boolean): { maintenance: number; target: number } {
    const maintenance = devMaintenance(settings, isImperial)
    if (settings.goalType === 'lose') {
        const pace = Math.min(settings.goalPace, maxPaceFor(settings, isImperial))
        return { maintenance, target: Math.max(1, Math.round(maintenance - (pace * 3500) / 7)) }
    }
    if (settings.goalType === 'gain') {
        const pace = Math.min(settings.goalPace, DEV_PACE_CEILING)
        return { maintenance, target: Math.max(1, Math.round(maintenance + (pace * 3500) / 7)) }
    }
    return { maintenance, target: Math.max(1, Math.round(maintenance)) }
}

/**
 * The priority split: protein and fat priced off the basis weight, carbs as whatever the target has left.
 * Carbs being last is what preserves reconciliation — the three add back to the target within
 * integer-rounding slack — and carbs are the right flexible bucket, training fuel rather than a structural
 * requirement. No floors and no scale-down: a computed target covers protein + fat by construction of the
 * pace cap, and a hand-edited one that doesn't gets the warning, not a repair. Carbs clamp at 0, not 1 —
 * a cut at the cap is honestly a zero-carb day, and only a hand-edit below the floor can hit the clamp;
 * protein and fat keep the 1 g fence so a degenerate profile can't render a 0 g row.
 */
export function devSplitMacros(goalType: Settings['goalType'], calories: number, weightKg: number) {
    const proteinGrams = stableGrams(weightKg, PROTEIN_G_PER_LB[goalType])
    const fatGrams = stableGrams(weightKg, FAT_G_PER_LB[goalType])
    return {
        proteinGrams: Math.max(1, proteinGrams),
        fatGrams: Math.max(1, fatGrams),
        carbGrams: Math.max(0, Math.round((calories - proteinGrams * 4 - fatGrams * 9) / 4)),
    }
}
