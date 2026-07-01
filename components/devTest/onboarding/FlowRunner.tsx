import { useColors } from '@/context/ThemeContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState, type ComponentType } from 'react'
import { View } from 'react-native'
import { OnboardingFlowProvider, type OnboardingFlow } from './versions/_shared/flowContext'
import { PAGES } from './registry'

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
 */
const BASE_EXCLUDE = ['gender', 'heightWeight']
const NUMBERED = new Set(['goalMotivation', 'obstacles', 'birthday', 'activity', 'goal', 'pace', 'resultsTimeline', 'macros', 'summary'])

export default function FlowRunner() {
    const colors = useColors()
    const router = useRouter()
    const { version } = useLocalSearchParams<{ version?: string }>()
    const versionId = version ?? 'v3'

    const steps = useMemo(() => {
        const exclude = new Set(versionId === 'v4' ? BASE_EXCLUDE : [...BASE_EXCLUDE, 'intro', 'preboard'])
        return PAGES.filter((p) => !exclude.has(p.key))
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

    // Contiguous "Step N of M" over the numbered screens actually shown (skip-adjusted).
    const currentKey = steps[index]?.key
    const visibleNumbered = steps.filter((s) => NUMBERED.has(s.key) && !skip(s.key))
    const stepTotal = visibleNumbered.length
    const stepNumber = currentKey != null && NUMBERED.has(currentKey) && !skip(currentKey) ? visibleNumbered.findIndex((s) => s.key === currentKey) + 1 : null

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
