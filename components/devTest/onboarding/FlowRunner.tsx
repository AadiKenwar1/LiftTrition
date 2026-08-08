import { useColors } from '@/context/ThemeContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState, type ComponentType } from 'react'
import { View } from 'react-native'
import { OnboardingFlowProvider, type OnboardingFlow } from './versions/_shared/flowContext'
import { PAGES, type OnboardingPage } from './registry'

/**
 * Dev-only walkthrough that plays a whole version's flow end-to-end. Reached via
 * `/devTest/onboardingFlow?version=<id>` (defaults to v3). Builds the ordered step list from the registry
 * (one screen per flow step) and renders one at a time. A small shared `data` bag lets a screen's choice
 * steer the flow — e.g. choosing "Maintain" on the eating-phase step skips the pace ("how fast") step.
 *
 * Exclusions are version-aware: every version drops the redundant unmerged gender/heightWeight rows (About
 * You already merges them); v3 additionally drops intro/preboard. v4 has NO intro or preboard versions at all
 * (Login already brands the opener, and "Before we start" made no sense after two answered questions — its
 * privacy line moved onto About You) — pages with no matching version fall out of the step list naturally.
 * The runner also computes a contiguous, skip-aware "Step N of M" over the NUMBERED screens and hands it to
 * the context so V4Screen can render honest progress.
 *
 * v5 REORDERS the flow rather than restyling it — the three tap screens run first (goals, obstacles, activity),
 * the merged goal screen carries the weight numbers, About You is trimmed to the leftover calorie inputs, and
 * the projection lands LAST so it follows the finished plan instead of preceding it. Results timeline is cut.
 * Its sequence can't be read off the registry's row order the way v3/v4 are; it's declared in V5_ORDER.
 *
 * v6 changes v5's writing rather than its order, so it walks the same screens with one addition: the rating
 * ask between the projection and the paywall. It therefore declares its own V6_ORDER instead of sharing v5's.
 */
const BASE_EXCLUDE = ['gender', 'heightWeight']
const NUMBERED = new Set(['goalMotivation', 'obstacles', 'birthday', 'activity', 'goal', 'pace', 'resultsTimeline', 'macros', 'summary'])
const V5_ORDER = ['login', 'goalMotivation', 'obstacles', 'activity', 'goal', 'birthday', 'pace', 'macros', 'summary', 'paywall']
// v6 walks v5's sequence plus the rating ask, which sits between the projection and the paywall: the ask needs
// something the user is glad to see in front of it, and it must come before the price rather than after it.
const V6_ORDER = ['login', 'goalMotivation', 'obstacles', 'activity', 'goal', 'birthday', 'pace', 'macros', 'summary', 'rating', 'paywall']
const REORDERED: Record<string, string[]> = { v5: V5_ORDER, v6: V6_ORDER }

export default function FlowRunner() {
    const colors = useColors()
    const router = useRouter()
    const { version } = useLocalSearchParams<{ version?: string }>()
    const versionId = version ?? 'v3'

    const steps = useMemo(() => {
        const exclude = new Set(versionId === 'v4' ? BASE_EXCLUDE : [...BASE_EXCLUDE, 'intro', 'preboard'])
        const order = REORDERED[versionId]
        const rows =
            order != null ?
                order.map((k) => PAGES.find((p) => p.key === k)).filter((p): p is OnboardingPage => p != null)
            :   PAGES.filter((p) => !exclude.has(p.key))
        return rows
            .map((p) => {
                const v = p.versions.find((x) => x.id === versionId)
                return v ? { key: p.key, Component: v.Component } : null
            })
            .filter((s): s is { key: string; Component: ComponentType } => s != null)
    }, [versionId])

    const [index, setIndex] = useState(0)
    const [data, setData] = useState<Record<string, string>>({})

    // Conditional skips — pace ("how fast") is meaningless when maintaining weight.
    const skip = (key: string) => key === 'pace' && data.phase === 'maintain'
    const seek = (from: number, dir: 1 | -1) => {
        let i = from + dir
        while (i >= 0 && i < steps.length && skip(steps[i].key)) i += dir
        return i
    }

    // Contiguous "Step N of M" over the numbered screens actually shown. The maintain skip only shrinks the
    // total from the goal decision ONWARD — on the goal screen itself the user hasn't left the choice yet, so
    // the count would otherwise drop under their finger as they tap Maintain (matches lib/utils/onboardingSteps).
    const currentKey = steps[index]?.key
    const goalIdx = steps.findIndex((s) => s.key === 'goal')
    const numberingSkips = goalIdx >= 0 && index > goalIdx
    const visibleNumbered = steps.filter((s) => NUMBERED.has(s.key) && !(numberingSkips && skip(s.key)))
    const stepTotal = visibleNumbered.length
    const currentNumbered = visibleNumbered.findIndex((s) => s.key === currentKey)
    const stepNumber = currentKey != null && NUMBERED.has(currentKey) && currentNumbered >= 0 ? currentNumbered + 1 : null

    const flow: OnboardingFlow = {
        index,
        total: steps.length,
        stepNumber,
        stepTotal,
        data,
        setData: (k, v) => setData((s) => ({ ...s, [k]: v })),
        goNext: () => {
            const n = seek(index, 1)
            if (n < steps.length) setIndex(n)
            else router.back()
        },
        goBack: () => {
            const p = seek(index, -1)
            if (p >= 0) setIndex(p)
            else router.back()
        },
    }

    const Current = steps[index]?.Component

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <OnboardingFlowProvider value={flow}>{Current ? <Current key={index} /> : null}</OnboardingFlowProvider>
        </View>
    )
}
