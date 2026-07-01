import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { BicepsFlexed, Dumbbell, HeartPulse, Target, TrendingDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 Goal & Motivation. Options rest NEUTRAL and reveal their domain color on SELECTION — nutrition
 * goals (lose fat, reach goal weight, improve health) highlight green, training goals (build muscle, get
 * stronger) highlight blue — alternating in the list so neither color clusters. Screen chrome stays neutral.
 * Multi-select. Inert.
 */
const GOALS = [
    { id: 'losefat', icon: TrendingDown, label: 'Lose fat', domain: 'nutrition' as const },
    { id: 'muscle', icon: BicepsFlexed, label: 'Build muscle', domain: 'workout' as const },
    { id: 'weight', icon: Target, label: 'Reach goal weight', domain: 'nutrition' as const },
    { id: 'strength', icon: Dumbbell, label: 'Get stronger', domain: 'workout' as const },
    { id: 'health', icon: HeartPulse, label: 'Improve health', domain: 'nutrition' as const },
]

export default function GoalMotivationV4() {
    const colors = useColors()
    const router = useRouter()
    const [selected, setSelected] = useState<string[]>([])
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
        <V4Screen step={0} totalSteps={9} eyebrow="Step 1 of 9" title="What are your goals?" subtitle="Pick all that apply — we'll build your whole plan around them." accent={colors.text} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 12 }}>
                {GOALS.map((g, i) => (
                    <V3Option key={g.id} index={i} icon={g.icon} label={g.label} accent={g.domain === 'workout' ? colors.workout : colors.nutrition} multiSelect selected={selected.includes(g.id)} onPress={() => toggle(g.id)} />
                ))}
            </View>
        </V4Screen>
    )
}
