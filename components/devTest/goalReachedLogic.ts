import {
    applySwitchToMaintenance as applySettingsSwitchToMaintenance,
    computeBwUpdate,
    isGoalReached as isSettingsGoalReached,
    OVERSHOOT_DEADBAND,
} from '@/context/SettingsContext/functions/bodyWeightFunctions'
import { calculateMacros } from '@/context/SettingsContext/functions/macroCalculation'
import type { Settings } from '@/context/SettingsContext/types'

/**
 * Dev-only sandbox layer over the PRODUCTION issue-8 logic. The rules live in
 * context/SettingsContext/functions (computeBwUpdate / applySwitchToMaintenance /
 * calculateMacros with the maintenance anchor); this module only adapts a slim SimState
 * with a fixed dev profile onto real Settings and narrates outcomes as event strings.
 */

export interface SimState {
    unitSystem: 'imperial' | 'metric'
    goalType: 'lose' | 'gain' | 'maintain'
    goalWeight: number
    goalPace: number
    bodyWeight: number
    calorieGoal: number
    proteinGoal: number
    carbsGoal: number
    fatsGoal: number
    macrosCustomized: boolean
    goalOvershootAcknowledged: boolean
}

export type PromptKind = 'goalReached' | 'autoMaintain'

export interface WeighInOutcome {
    state: SimState
    events: string[]
    prompt: PromptKind | null
}

export { OVERSHOOT_DEADBAND }

// Fixed dev profile for TDEE math (male, 28, 5'10" / 178 cm, moderate activity)
const PROFILE = {
    birthDate: new Date('1998-01-01T00:00:00'),
    gender: 'male' as const,
    activityLevel: 'moderate' as const,
    heightImperial: 70,
    heightMetric: 178,
}

export function unitLabel(state: Pick<SimState, 'unitSystem'>): 'lbs' | 'kg' {
    return state.unitSystem === 'imperial' ? 'lbs' : 'kg'
}

function toSettings(state: SimState): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: PROFILE.birthDate,
        gender: PROFILE.gender,
        activityLevel: PROFILE.activityLevel,
        height: state.unitSystem === 'imperial' ? PROFILE.heightImperial : PROFILE.heightMetric,
        unitSystem: state.unitSystem,
        bodyWeight: state.bodyWeight,
        goalType: state.goalType,
        goalWeight: state.goalWeight,
        goalPace: state.goalPace,
        calorieGoal: state.calorieGoal,
        proteinGoal: state.proteinGoal,
        carbsGoal: state.carbsGoal,
        fatsGoal: state.fatsGoal,
        macrosCustomized: state.macrosCustomized,
        goalOvershootAcknowledged: state.goalOvershootAcknowledged,
    }
}

function fromSettings(prev: SimState, s: Settings): SimState {
    return {
        ...prev,
        bodyWeight: s.bodyWeight,
        goalType: s.goalType,
        goalPace: s.goalPace,
        calorieGoal: s.calorieGoal,
        proteinGoal: s.proteinGoal,
        carbsGoal: s.carbsGoal,
        fatsGoal: s.fatsGoal,
        macrosCustomized: s.macrosCustomized,
        goalOvershootAcknowledged: s.goalOvershootAcknowledged,
    }
}

function recalcTargets(state: SimState): SimState {
    const macros = calculateMacros(toSettings(state), state.unitSystem === 'imperial')
    return { ...state, calorieGoal: macros.calResult, proteinGoal: macros.proteinGrams, carbsGoal: macros.carbGrams, fatsGoal: macros.fatGrams }
}

function targetsSummary(state: SimState): string {
    return `${state.calorieGoal} kcal · P${state.proteinGoal} C${state.carbsGoal} F${state.fatsGoal}`
}

export function initSimState(init: Pick<SimState, 'unitSystem' | 'goalType' | 'goalWeight' | 'goalPace' | 'bodyWeight'>): SimState {
    const base: SimState = {
        ...init,
        calorieGoal: 0,
        proteinGoal: 0,
        carbsGoal: 0,
        fatsGoal: 0,
        macrosCustomized: false,
        goalOvershootAcknowledged: false,
    }
    return recalcTargets(base)
}

/** Banner predicate — pure derived state, no storage. */
export function isGoalReached(state: SimState): boolean {
    return isSettingsGoalReached(toSettings(state))
}

export function applyWeighIn(prev: SimState, newWeight: number): WeighInOutcome {
    const unit = unitLabel(prev)
    const events: string[] = [`Weigh-in: ${prev.bodyWeight} → ${newWeight} ${unit}`]

    const result = computeBwUpdate(newWeight, toSettings(prev))
    if (!result) return { state: prev, events: [...events, 'Rejected — invalid weight'], prompt: null }

    const state = fromSettings(prev, result.newSettings)

    if (state.macrosCustomized) {
        events.push('Targets preserved — hand-tuned (macrosCustomized)')
    } else if (prev.goalType === 'maintain') {
        events.push(`Targets pinned to maintain weight ${state.goalWeight} ${unit} — weigh-ins never move them: ${targetsSummary(state)}`)
    } else {
        events.push(`Targets recalculated for "${prev.goalType}": ${targetsSummary(state)}`)
    }

    if (result.prompt === 'autoMaintain') {
        events.push(
            state.macrosCustomized
                ? `Safety net: ${OVERSHOOT_DEADBAND[state.unitSystem]} ${unit} past goal → auto-switched to maintain (announced); hand-tuned targets kept`
                : `Safety net: ${OVERSHOOT_DEADBAND[state.unitSystem]} ${unit} past goal → auto-switched to maintain (announced): ${targetsSummary(state)}`,
        )
    } else if (result.prompt === 'goalReached') {
        events.push('Crossed goal weight → congrats prompt (goalType untouched)')
    }

    return { state, events, prompt: result.prompt }
}

export function applySwitchToMaintenance(prev: SimState): WeighInOutcome {
    const state = fromSettings(prev, applySettingsSwitchToMaintenance(toSettings(prev)))
    const events = [
        state.macrosCustomized
            ? 'User chose "Switch to Maintenance" — goalType=maintain; hand-tuned targets kept'
            : `User chose "Switch to Maintenance" — goalType=maintain: ${targetsSummary(state)}`,
    ]
    return { state, events, prompt: null }
}

export function applyKeepGoing(prev: SimState): WeighInOutcome {
    return {
        state: { ...prev, goalOvershootAcknowledged: true },
        events: ['User chose "Keep Going" — auto-switch disarmed for this goal; banner stays'],
        prompt: null,
    }
}

export function applyHandTuneMacros(prev: SimState): WeighInOutcome {
    const state: SimState = { ...prev, macrosCustomized: true, proteinGoal: prev.proteinGoal + 25 }
    return {
        state,
        events: [`Hand-tuned macros (protein +25g) — macrosCustomized set: ${targetsSummary(state)}`],
        prompt: null,
    }
}

export function applyAcceptRecalc(prev: SimState): WeighInOutcome {
    const state = recalcTargets({ ...prev, macrosCustomized: false })
    return {
        state,
        events: [`Explicit recalc accepted — macrosCustomized cleared, targets regenerated: ${targetsSummary(state)}`],
        prompt: null,
    }
}
