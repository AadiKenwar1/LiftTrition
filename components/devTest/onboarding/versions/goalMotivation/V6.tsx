import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { BicepsFlexed, Dumbbell, HeartPulse, Target, TrendingDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V6 Goal & Motivation — V5's screen with only the copy changed. The subtitle keeps V5's claim that
 * the plan is built around what the user picks. Nothing reads that selection back: it reaches the flow bag and
 * stops there, so the line is aspirational and stays that way on purpose. The copy pass changed the sentence
 * only. The em dash hinge that four other subtitles shared becomes a period, so the run of screens no longer
 * reads as one template, and "your plan around your goals" loses the doubled "your". Step 1 of 8. Inert.
 */
const GOALS = [
    { id: 'losefat', icon: TrendingDown, label: 'Lose fat', domain: 'nutrition' as const },
    { id: 'muscle', icon: BicepsFlexed, label: 'Build muscle', domain: 'workout' as const },
    { id: 'weight', icon: Target, label: 'Reach goal weight', domain: 'nutrition' as const },
    { id: 'strength', icon: Dumbbell, label: 'Get stronger', domain: 'workout' as const },
    { id: 'health', icon: HeartPulse, label: 'Improve health', domain: 'nutrition' as const },
]

export default function GoalMotivationV6() {
    const colors = useColors()
    const router = useRouter()
    const flow = useOnboardingFlow()
    const [selected, setSelected] = useState<string[]>([])

    // Computed outside the state updater so the flow write happens once per press, not per updater replay.
    const toggle = (id: string) => {
        const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
        setSelected(next)
        flow?.setData('goals', next.join(','))
    }

    return (
        <V4Screen step={0} totalSteps={8} eyebrow="Step 1 of 8" title="What are your goals?" subtitle="Pick all that apply. We build your plan around them." accent={colors.text} nextDisabled={selected.length === 0} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 12 }}>
                {GOALS.map((g, i) => (
                    <V3Option key={g.id} index={i} icon={g.icon} label={g.label} accent={g.domain === 'workout' ? colors.workout : colors.nutrition} multiSelect selected={selected.includes(g.id)} onPress={() => toggle(g.id)} />
                ))}
            </View>
        </V4Screen>
    )
}
