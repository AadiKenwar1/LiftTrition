import { Settings } from './types'

// The single new-user default. Both hydration paths (powersyncStore cold-load
// fallback + provider initial state) and the NULL-column fallbacks read from
// here, so every code path agrees on the same values (goalPace was 0 vs 0.5
// depending on which file hydrated the user).
export const DEFAULT_SETTINGS: Settings = {
    onboardingComplete: false,
    onboardingCompletedAt: undefined,
    birthDate: new Date(),
    gender: 'male',
    height: 175,
    bodyWeight: 170,
    activityLevel: 'moderate',
    unitSystem: 'imperial',
    goalType: 'maintain',
    goalWeight: 190,
    goalPace: 0.5,
    calorieGoal: 2000,
    proteinGoal: 130,
    carbsGoal: 200,
    fatsGoal: 54,
    macrosCustomized: false,
    goalOvershootAcknowledged: false,
}
