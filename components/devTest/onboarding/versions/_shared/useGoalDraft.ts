import { validateTargetWeight, validateWeight } from '@/context/SettingsContext/functions/validator'
import { kgToLbs, lbsToKg, weightUnitLabel } from '@/lib/utils/unitConversions'
import { useState } from 'react'
import type { OnboardingFlow } from './flowContext'

/**
 * Dev-only shared state for the goal screen's one-screen layout variants. V5's goal screen scrolls on smaller
 * phones — and focusing a weight field puts the keyboard over the rest — so several layouts compete to fit it
 * in one view. They differ ONLY in presentation, so the phase/unit/weight state, the unit conversion and the
 * production validation live here once and each variant file stays a layout.
 */
export type Phase = 'cut' | 'maintain' | 'bulk'

export const PHASES = [
    { id: 'cut' as const, label: 'Cut', sub: 'Eat in a deficit to lose fat' },
    { id: 'maintain' as const, label: 'Maintain', sub: 'Eat at maintenance to recomp' },
    { id: 'bulk' as const, label: 'Bulk', sub: 'Eat in a surplus to gain' },
]

export function useGoalDraft(flow: OnboardingFlow | null) {
    const [phase, setPhase] = useState<Phase | null>(null)
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial')
    const [weight, setWeight] = useState('')
    const [target, setTarget] = useState('')

    const unit = weightUnitLabel(unitSystem)
    const needsTarget = phase != null && phase !== 'maintain'
    const filled = phase != null && weight.trim() !== '' && (!needsTarget || target.trim() !== '')
    const description = PHASES.find((p) => p.id === phase)?.sub ?? ''

    // Signed gap between the two entries, or null until both are numbers — the variants that show it are
    // betting the delta is the motivating part of this screen. Rounded to 1dp because lbsToKg/kgToLbs round
    // there too, so subtracting two converted values otherwise renders as 9.100000000000001.
    const current = Number(weight) || 0
    const goal = Number(target) || 0
    const delta = needsTarget && current > 0 && goal > 0 ? Math.round((goal - current) * 10) / 10 : null

    // Clearing the target on maintain stops a backed-out cut/bulk from leaking a goal weight downstream.
    const choosePhase = (p: Phase) => {
        setPhase(p)
        flow?.setData('phase', p)
        if (p === 'maintain') setTarget('')
    }

    const toggleUnit = (next: 'imperial' | 'metric') => {
        if (next === unitSystem) return
        const convert = (v: string) => {
            const n = Number(v) || 0
            return n > 0 ? (next === 'metric' ? lbsToKg(n) : kgToLbs(n)).toString() : v
        }
        setWeight(convert(weight))
        setTarget(convert(target))
        setUnitSystem(next)
        flow?.setData('unit', next)
    }

    // Runs on Next: the production validators (Alert + false to stay put), then publish to the flow bag.
    const commit = (): boolean => {
        if (!validateWeight(current, unitSystem)) return false
        if (needsTarget) {
            if (!validateTargetWeight(goal, current, phase === 'cut' ? 'lose' : 'gain', unitSystem)) return false
            flow?.setData('target', String(goal))
        } else {
            flow?.setData('target', '')
        }
        flow?.setData('unit', unitSystem)
        flow?.setData('weight', String(current))
        return true
    }

    return { phase, unitSystem, weight, target, unit, needsTarget, filled, description, delta, setWeight, setTarget, choosePhase, toggleUnit, commit }
}
