import {
    applyAcceptRecalc,
    applyHandTuneMacros,
    applyKeepGoing,
    applySwitchToMaintenance,
    applyWeighIn,
    initSimState,
    isGoalReached,
    type SimState,
} from '../goalReachedLogic'

function loseState(overrides: Partial<SimState> = {}): SimState {
    const base = initSimState({ unitSystem: 'imperial', goalType: 'lose', goalWeight: 170, goalPace: 1, bodyWeight: 175 })
    return { ...base, ...overrides }
}

describe('goalReachedLogic (Issue 8 rules)', () => {
    test('maintain user + scale noise: goalType and pace never flip', () => {
        const state = initSimState({ unitSystem: 'imperial', goalType: 'maintain', goalWeight: 170, goalPace: 0.5, bodyWeight: 170 })
        const { state: next, prompt } = applyWeighIn(state, 170.5)
        expect(next.goalType).toBe('maintain')
        expect(next.goalPace).toBe(0.5)
        expect(prompt).toBeNull()
    })

    test('weigh-in before crossing: targets recalc for current goal, no prompt', () => {
        const { state: next, prompt } = applyWeighIn(loseState(), 173)
        expect(next.goalType).toBe('lose')
        expect(next.bodyWeight).toBe(173)
        expect(prompt).toBeNull()
        expect(isGoalReached(next)).toBe(false)
    })

    test('crossing goal (lose) fires goalReached prompt but leaves goalType alone', () => {
        const state = loseState({ bodyWeight: 170.5 })
        const { state: next, prompt } = applyWeighIn(state, 169.8)
        expect(prompt).toBe('goalReached')
        expect(next.goalType).toBe('lose')
        expect(isGoalReached(next)).toBe(true)
    })

    test('crossing goal (gain, landing exactly at goal) fires goalReached prompt', () => {
        const state = initSimState({ unitSystem: 'imperial', goalType: 'gain', goalWeight: 170, goalPace: 0.5, bodyWeight: 169.5 })
        const { state: next, prompt } = applyWeighIn(state, 170)
        expect(prompt).toBe('goalReached')
        expect(next.goalType).toBe('gain')
    })

    test('ask before act: a single jump past the deadband still asks instead of auto-switching', () => {
        const state = loseState({ bodyWeight: 171 })
        const { state: next, prompt } = applyWeighIn(state, 167)
        expect(prompt).toBe('goalReached')
        expect(next.goalType).toBe('lose')
    })

    test('safety net: inside deadband does nothing, at deadband auto-switches to maintain (announced)', () => {
        const past = loseState({ bodyWeight: 169 })
        const inside = applyWeighIn(past, 168.5)
        expect(inside.prompt).toBeNull()
        expect(inside.state.goalType).toBe('lose')

        const at = applyWeighIn(inside.state, 168)
        expect(at.prompt).toBe('autoMaintain')
        expect(at.state.goalType).toBe('maintain')
    })

    test('metric deadband is 1 kg', () => {
        const state = initSimState({ unitSystem: 'metric', goalType: 'gain', goalWeight: 77, goalPace: 0.5, bodyWeight: 77.2 })
        expect(applyWeighIn(state, 77.9).prompt).toBeNull()
        const fired = applyWeighIn(state, 78)
        expect(fired.prompt).toBe('autoMaintain')
        expect(fired.state.goalType).toBe('maintain')
    })

    test('Keep Going disarms the safety net and future prompts for this goal', () => {
        const acknowledged = applyKeepGoing(loseState({ bodyWeight: 169.8 })).state
        expect(acknowledged.goalOvershootAcknowledged).toBe(true)
        const { state: next, prompt } = applyWeighIn(acknowledged, 166)
        expect(prompt).toBeNull()
        expect(next.goalType).toBe('lose')
    })

    test('hand-tuned macros survive weigh-ins', () => {
        const tuned = applyHandTuneMacros(loseState()).state
        const { state: next } = applyWeighIn(tuned, 173)
        expect(next.calorieGoal).toBe(tuned.calorieGoal)
        expect(next.proteinGoal).toBe(tuned.proteinGoal)
        expect(next.macrosCustomized).toBe(true)
    })

    test('hand-tuned macros survive even the auto-maintain switch', () => {
        const tuned = applyHandTuneMacros(loseState({ bodyWeight: 169 })).state
        const { state: next, prompt } = applyWeighIn(tuned, 168)
        expect(prompt).toBe('autoMaintain')
        expect(next.goalType).toBe('maintain')
        expect(next.proteinGoal).toBe(tuned.proteinGoal)
    })

    test('Switch to Maintenance applies immediately and re-arms acknowledgement', () => {
        const acknowledged = applyKeepGoing(loseState({ bodyWeight: 169.8 })).state
        const { state: next } = applySwitchToMaintenance(acknowledged)
        expect(next.goalType).toBe('maintain')
        expect(next.goalOvershootAcknowledged).toBe(false)
    })

    test('explicit recalc clears the customized flag and regenerates targets', () => {
        const tuned = applyHandTuneMacros(loseState()).state
        const { state: next } = applyAcceptRecalc(tuned)
        expect(next.macrosCustomized).toBe(false)
        expect(next.proteinGoal).toBe(tuned.proteinGoal - 25)
    })
})
