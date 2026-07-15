import { Settings } from '../types'

//Activity multipliers for TDEE (Mifflin-St Jeor flow)
function getActivityFactor(activityLevel: Settings['activityLevel']): number {
    const factorMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, gymrat: 1.9 }
    return factorMap[activityLevel]
}

//Calculate age from birth date
function calculateAge(birthDate: Date): number {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

//Macro preset splits
const MACRO_PRESETS = { lose: { protein: 0.35, fat: 0.25, carbs: 0.4 }, maintain: { protein: 0.3, fat: 0.25, carbs: 0.45 }, gain: { protein: 0.25, fat: 0.25, carbs: 0.5 } } as const

/**
 * Mifflin-St Jeor → BMR → TDEE -> Daily Adjustment -> Macros
 * No deficit/surplus adjustment (calories = TDEE)
 * Macro split driven by goalType preset.
 * Maintenance anchors to goalWeight (the maintain weight), not the drifting scale
 * weight — weigh-ins never move a maintain user's targets. goalWeight <= 0 falls
 * back to bodyWeight so a legacy row without an anchor can't zero the BMR.
 */
export function calculateMacros(settings: Settings, isImperial: boolean = true) {
    const weightForTargets = settings.goalType === 'maintain' && settings.goalWeight > 0 ? settings.goalWeight : settings.bodyWeight
    let weightKg = weightForTargets
    let heightCm = settings.height
    const age = calculateAge(settings.birthDate)
    const gender = settings.gender

    if (isImperial) {
        weightKg = weightForTargets / 2.20462
        heightCm = settings.height * 2.54
    }

    // Step 1: BMR (Mifflin-St Jeor)
    let BMR: number
    if (gender === 'male') {
        BMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    } else {
        BMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    }

    // Step 2: TDEE (maintenance calories, no ± adjustment)
    const activityFactor = getActivityFactor(settings.activityLevel)
    let TDEE = BMR * activityFactor

    const dailyAdjustment = (settings.goalPace * 3500) / 7
    if (settings.goalType === 'lose') {
        TDEE -= dailyAdjustment
    } else if (settings.goalType === 'gain') {
        TDEE += dailyAdjustment
    }

    // Step 3: Macro split from goal preset
    const preset = MACRO_PRESETS[settings.goalType]
    const proteinGrams = (TDEE * preset.protein) / 4
    const fatGrams = (TDEE * preset.fat) / 9
    const carbGrams = (TDEE * preset.carbs) / 4

    //Harvard Health Publishing recommends at least 1500 calories for men and 1200 calories for women
    const minCalories = settings.gender === 'male' ? 1500 : 1200
    return { calResult: Math.max(minCalories, Math.round(TDEE)), proteinGrams: Math.max(1, Math.round(proteinGrams)), fatGrams: Math.max(1, Math.round(fatGrams)), carbGrams: Math.max(1, Math.round(carbGrams)) }
}
