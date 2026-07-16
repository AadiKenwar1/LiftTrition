import { goalReachedBannerCopy } from '@/context/SettingsContext/functions/bodyWeightFunctions'
import { applyKeepGoing, applySwitchToMaintenance, applyWeighIn, initSimState, isGoalReached, type SimState } from './goalReachedLogic'

/**
 * Dev-only self-checking walkthroughs of the issue-8 main paths. Each path drives the
 * PRODUCTION weigh-in logic (via goalReachedLogic → computeBwUpdate) through a scripted
 * sequence, narrates each step, and asserts the outcome (✓/✗). They exist because the
 * interesting paths (re-arm, oscillator) are multi-step — weigh, Keep Going, weigh, weigh —
 * and tedious to reproduce by hand. Read the result in the sim's event log.
 */

type SimInit = Parameters<typeof initSimState>[0]

export interface PathResult {
    lines: string[]
    finalState: SimState
    pass: boolean
}

function runner(init: SimInit) {
    let state = initSimState(init)
    let lastPrompt: 'goalReached' | null = null
    const lines: string[] = []
    let pass = true

    return {
        weigh(w: number) {
            const out = applyWeighIn(state, w)
            state = out.state
            lastPrompt = out.prompt
            lines.push(...out.events)
        },
        keepGoing() {
            const out = applyKeepGoing(state)
            state = out.state
            lastPrompt = null
            lines.push(...out.events)
        },
        switchToMaintenance() {
            const out = applySwitchToMaintenance(state)
            state = out.state
            lastPrompt = null
            lines.push(...out.events)
        },
        check(desc: string, cond: boolean) {
            lines.push(`${cond ? '✓' : '✗'} ${desc}`)
            if (!cond) pass = false
        },
        prompted: () => lastPrompt === 'goalReached',
        muted: () => state.goalOvershootAcknowledged,
        bannerShown: () => isGoalReached(state),
        bannerCopy: () => goalReachedBannerCopy(state),
        snapshot: () => state,
        finish: (): PathResult => ({ lines, finalState: state, pass }),
    }
}

const LOSE_170: SimInit = { unitSystem: 'imperial', goalType: 'lose', goalWeight: 170, goalPace: 1, bodyWeight: 172 }

function rearm(): PathResult {
    const r = runner(LOSE_170)
    r.weigh(170)
    r.check('reaching goal fires the prompt', r.prompted())
    r.keepGoing()
    r.check('Keep Going mutes the ask', r.muted())
    r.weigh(172)
    r.check('back above goal clears the mute (re-arm)', !r.muted())
    r.check('banner gone while above goal', !r.bannerShown())
    r.weigh(170)
    r.check('re-reaching goal asks again', r.prompted())
    return r.finish()
}

function committedCutter(): PathResult {
    const r = runner(LOSE_170)
    r.weigh(170)
    r.check('prompt on first reach', r.prompted())
    r.keepGoing()
    r.weigh(168)
    r.check('no prompt at 168 (still muted)', !r.prompted())
    r.weigh(165)
    r.check('no prompt at 165 (still muted)', !r.prompted())
    r.check('mute survives the whole way down', r.muted())
    r.check('banner still shows', r.bannerShown())
    r.check('banner names the drift: "5 lbs past your goal"', r.bannerCopy() === '5 lbs past your goal — set your next goal')
    return r.finish()
}

function oscillator(): PathResult {
    const r = runner({ ...LOSE_170, bodyWeight: 171 })
    r.weigh(170)
    r.check('prompt on reach', r.prompted())
    r.keepGoing()
    r.weigh(170.4)
    r.check('water blip above goal re-arms', !r.muted())
    r.weigh(169.8)
    r.check('dropping back re-nags (accepted zero-margin cost)', r.prompted())
    return r.finish()
}

function gainMirror(): PathResult {
    const r = runner({ unitSystem: 'imperial', goalType: 'gain', goalWeight: 170, goalPace: 0.5, bodyWeight: 169 })
    r.weigh(170)
    r.check('reaching gain goal fires the prompt', r.prompted())
    r.keepGoing()
    r.weigh(169.5)
    r.check('dropping below goal re-arms', !r.muted())
    r.check('banner gone below goal', !r.bannerShown())
    r.weigh(170)
    r.check('re-reaching asks again', r.prompted())
    return r.finish()
}

function maintainRegression(): PathResult {
    const r = runner({ unitSystem: 'imperial', goalType: 'maintain', goalWeight: 170, goalPace: 0.5, bodyWeight: 170 })
    r.weigh(170.5)
    r.check('no prompt (170.5)', !r.prompted())
    r.weigh(168)
    r.check('no prompt (168)', !r.prompted())
    r.weigh(172)
    r.check('no prompt (172)', !r.prompted())
    r.check('never a banner in maintain', !r.bannerShown())
    return r.finish()
}

function switchClears(): PathResult {
    const r = runner(LOSE_170)
    r.weigh(170)
    r.check('prompt on reach', r.prompted())
    r.keepGoing()
    r.switchToMaintenance()
    r.check('goalType switched to maintain', r.snapshot().goalType === 'maintain')
    r.check('mute cleared by the switch', !r.muted())
    r.check('banner gone (maintain never shows it)', !r.bannerShown())
    return r.finish()
}

function bannerCopy(): PathResult {
    const lines: string[] = []
    let pass = true
    const check = (desc: string, cond: boolean) => {
        lines.push(`${cond ? '✓' : '✗'} ${desc}`)
        if (!cond) pass = false
    }
    const copy = (s: Parameters<typeof goalReachedBannerCopy>[0]) => goalReachedBannerCopy(s)

    check('lose, at goal → "Goal reached…"', copy({ goalType: 'lose', bodyWeight: 170, goalWeight: 170, unitSystem: 'imperial' }) === 'Goal reached — set your next goal')
    check('lose, 1.9 past → still "Goal reached…" (within 2 lb band)', copy({ goalType: 'lose', bodyWeight: 168.1, goalWeight: 170, unitSystem: 'imperial' }) === 'Goal reached — set your next goal')
    check('lose, exactly 2 past → "2 lbs past…"', copy({ goalType: 'lose', bodyWeight: 168, goalWeight: 170, unitSystem: 'imperial' }) === '2 lbs past your goal — set your next goal')
    check('lose, 4.5 past → decimal "4.5 lbs past…"', copy({ goalType: 'lose', bodyWeight: 165.5, goalWeight: 170, unitSystem: 'imperial' }) === '4.5 lbs past your goal — set your next goal')
    check('gain, 3 past → "3 lbs past…"', copy({ goalType: 'gain', bodyWeight: 173, goalWeight: 170, unitSystem: 'imperial' }) === '3 lbs past your goal — set your next goal')
    check('metric, 1 kg past → "1 kg past…"', copy({ goalType: 'gain', bodyWeight: 78, goalWeight: 77, unitSystem: 'metric' }) === '1 kg past your goal — set your next goal')
    check('metric, 0.5 past → "Goal reached…" (within 1 kg band)', copy({ goalType: 'lose', bodyWeight: 76.5, goalWeight: 77, unitSystem: 'metric' }) === 'Goal reached — set your next goal')

    return { lines, pass, finalState: initSimState({ unitSystem: 'imperial', goalType: 'lose', goalWeight: 170, goalPace: 1, bodyWeight: 165.5 }) }
}

export const GOAL_REACHED_PATHS: { key: string; label: string; run: () => PathResult }[] = [
    { key: 'rearm', label: 'Re-arm after Keep Going (glitch fix)', run: rearm },
    { key: 'cutter', label: 'Committed cutter — muted, banner drifts', run: committedCutter },
    { key: 'oscillator', label: 'Oscillator — re-nags by design', run: oscillator },
    { key: 'gain', label: 'Gain mirror — re-arm below goal', run: gainMirror },
    { key: 'maintain', label: 'Maintain — never prompts/banners', run: maintainRegression },
    { key: 'switch', label: 'Switch to Maintenance clears all', run: switchClears },
    { key: 'copy', label: 'Banner copy — band, decimals, units', run: bannerCopy },
]

export function runGoalReachedPaths(): { label: string; result: PathResult }[] {
    return GOAL_REACHED_PATHS.map((p) => ({ label: p.label, result: p.run() }))
}
