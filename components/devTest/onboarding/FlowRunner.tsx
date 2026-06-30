import { useColors } from '@/context/ThemeContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState, type ComponentType } from 'react'
import { View } from 'react-native'
import { OnboardingFlowProvider, type OnboardingFlow } from './versions/_shared/flowContext'
import { PAGES } from './registry'

/**
 * Dev-only walkthrough that plays a whole version's flow end-to-end. Reached via
 * `/devTest/onboardingFlow?version=<id>` (defaults to v3). Builds the ordered step list from the registry
 * (one screen per flow step), skipping the unmerged-alt rows since About You already covers them, then
 * renders one screen at a time. A small shared `data` bag lets a screen's choice steer the flow — e.g.
 * choosing "Maintain" on the eating-phase step skips the pace ("how fast") step, which is meaningless then.
 */
const EXCLUDE = new Set(['gender', 'heightWeight', 'intro', 'preboard'])

export default function FlowRunner() {
    const colors = useColors()
    const router = useRouter()
    const { version } = useLocalSearchParams<{ version?: string }>()
    const versionId = version ?? 'v3'

    const steps = useMemo(
        () =>
            PAGES.filter((p) => !EXCLUDE.has(p.key))
                .map((p) => {
                    const v = p.versions.find((x) => x.id === versionId)
                    return v ? { key: p.key, Component: v.Component } : null
                })
                .filter((s): s is { key: string; Component: ComponentType } => s != null),
        [versionId],
    )

    const [index, setIndex] = useState(0)
    const [data, setData] = useState<Record<string, string>>({})

    // Conditional skips — pace ("how fast") is meaningless when maintaining weight.
    const skip = (key: string) => key === 'pace' && data.phase === 'maintain'
    const seek = (from: number, dir: 1 | -1) => {
        let i = from + dir
        while (i >= 0 && i < steps.length && skip(steps[i].key)) i += dir
        return i
    }

    const flow: OnboardingFlow = {
        index,
        total: steps.length,
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
