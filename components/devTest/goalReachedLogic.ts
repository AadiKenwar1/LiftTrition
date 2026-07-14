import { calculateMacros } from '@/context/SettingsContext/functions/macroCalculation'
import type { Settings } from '@/context/SettingsContext/types'

/**
 * Dev-only simulation of the Issue 8 weigh-in rules ("targets are derived, intent is owned").
 * Pure functions over SimState so the sandbox page can drive them and the real fix can port
 * them (with these semantics + the unit tests) into context/SettingsContext/functions.
 *
 * Rules simulated:
 * - Weigh-ins update bodyWeight and regenerate targets for the CURRENT goalType only —
 *   goalType/goalPace are never touched implicitly.
 * - macrosCustomized: hand-tuned targets survive every implicit recalculation.
 * - Crossing goalWeight in the goal's direction → one-time 'goalReached' prompt (ask).
 * - Safety net: only after the user had their chance (previous weight already at/past goal),
 *   passing goal by a unit-aware deadband auto-switches to maintain, announced (act).
 * - 'Keep Going' sets goalOvershootAcknowledged → no prompts, no net, until the goal changes.
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

export const OVERSHOOT_DEADBAND = { imperial: 2, metric: 1 } as const

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
    if (state.goalType === 'lose') return state.bodyWeight <= state.goalWeight
    if (state.goalType === 'gain') return state.bodyWeight >= state.goalWeight
    return false
}

function atOrPastGoal(state: SimState, weight: number): boolean {
    return state.goalType === 'lose' ? weight <= state.goalWeight : weight >= state.goalWeight
}

function pastDeadband(state: SimState, weight: number): boolean {
    const deadband = OVERSHOOT_DEADBAND[state.unitSystem]
    return state.goalType === 'lose' ? weight <= state.goalWeight - deadband : weight >= state.goalWeight + deadband
}

export function applyWeighIn(prev: SimState, newWeight: number): WeighInOutcome {
    const unit = unitLabel(prev)
    const events: string[] = [`Weigh-in: ${prev.bodyWeight} → ${newWeight} ${unit}`]
    let state: SimState = { ...prev, bodyWeight: newWeight }

    if (state.macrosCustomized) {
        events.push('Targets preserved — hand-tuned (macrosCustomized)')
    } else {
        state = recalcTargets(state)
        events.push(`Targets recalculated for "${state.goalType}": ${targetsSummary(state)}`)
    }

    let prompt: PromptKind | null = null
    if (state.goalType !== 'maintain' && !state.goalOvershootAcknowledged) {
        const wasPast = atOrPastGoal(prev, prev.bodyWeight)
        const crossed = !wasPast && atOrPastGoal(prev, newWeight)

        if (wasPast && pastDeadband(state, newWeight)) {
            state = { ...state, goalType: 'maintain' }
            if (state.macrosCustomized) {
                events.push(`Safety net: ${OVERSHOOT_DEADBAND[state.unitSystem]} ${unit} past goal → auto-switched to maintain (announced); hand-tuned targets kept`)
            } else {
                state = recalcTargets(state)
                events.push(`Safety net: ${OVERSHOOT_DEADBAND[state.unitSystem]} ${unit} past goal → auto-switched to maintain (announced): ${targetsSummary(state)}`)
            }
            prompt = 'autoMaintain'
        } else if (crossed) {
            events.push('Crossed goal weight → congrats prompt (goalType untouched)')
            prompt = 'goalReached'
        }
    }

    return { state, events, prompt }
}

export function applySwitchToMaintenance(prev: SimState): WeighInOutcome {
    let state: SimState = { ...prev, goalType: 'maintain', goalOvershootAcknowledged: false }
    const events: string[] = []
    if (state.macrosCustomized) {
        events.push('User chose "Switch to Maintenance" — goalType=maintain; hand-tuned targets kept')
    } else {
        state = recalcTargets(state)
        events.push(`User chose "Switch to Maintenance" — goalType=maintain: ${targetsSummary(state)}`)
    }
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
