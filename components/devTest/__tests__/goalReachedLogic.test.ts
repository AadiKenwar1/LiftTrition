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

    test('maintain targets anchor to the maintain weight — scale drift never moves them', () => {
        const state = initSimState({ unitSystem: 'imperial', goalType: 'maintain', goalWeight: 170, goalPace: 0.5, bodyWeight: 170 })
        const drifted = applyWeighIn(state, 174)
        expect(drifted.state.calorieGoal).toBe(state.calorieGoal)
        expect(drifted.state.proteinGoal).toBe(state.proteinGoal)
        expect(drifted.state.bodyWeight).toBe(174)
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

    test('a big jump straight past goal still only asks', () => {
        const state = loseState({ bodyWeight: 171 })
        const { state: next, prompt } = applyWeighIn(state, 167)
        expect(prompt).toBe('goalReached')
        expect(next.goalType).toBe('lose')
    })

    test('level-triggered: every weigh-in at/past goal asks again, and nothing ever switches', () => {
        const first = applyWeighIn(loseState({ bodyWeight: 170.5 }), 169.5)
        expect(first.prompt).toBe('goalReached')
        expect(first.state.goalType).toBe('lose')

        const second = applyWeighIn(first.state, 168)
        expect(second.prompt).toBe('goalReached')
        expect(second.state.goalType).toBe('lose')
    })

    test('Keep Going mutes the asking while staying at/past goal', () => {
        const acknowledged = applyKeepGoing(loseState({ bodyWeight: 169.8 })).state
        expect(acknowledged.goalOvershootAcknowledged).toBe(true)
        const { state: next, prompt } = applyWeighIn(acknowledged, 166)
        expect(prompt).toBeNull()
        expect(next.goalType).toBe('lose')
    })

    test('Keep Going mute clears when weight crosses back above goal; re-reaching asks again', () => {
        const acknowledged = applyKeepGoing(loseState({ bodyWeight: 169.8 })).state
        const bounced = applyWeighIn(acknowledged, 170.4)
        expect(bounced.state.goalOvershootAcknowledged).toBe(false)
        expect(bounced.events.some((e) => e.includes('re-arm'))).toBe(true)
        const rereached = applyWeighIn(bounced.state, 169.9)
        expect(rereached.prompt).toBe('goalReached')
    })

    test('hand-tuned macros survive weigh-ins', () => {
        const tuned = applyHandTuneMacros(loseState()).state
        const { state: next } = applyWeighIn(tuned, 173)
        expect(next.calorieGoal).toBe(tuned.calorieGoal)
        expect(next.proteinGoal).toBe(tuned.proteinGoal)
        expect(next.macrosCustomized).toBe(true)
    })

    test('hand-tuned macros survive the consented switch to maintenance', () => {
        const tuned = applyHandTuneMacros(loseState({ bodyWeight: 169 })).state
        const { state: next } = applySwitchToMaintenance(tuned)
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
