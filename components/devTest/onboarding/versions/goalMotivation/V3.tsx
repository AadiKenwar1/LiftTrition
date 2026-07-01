import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { BicepsFlexed, Dumbbell, HeartPulse, Target, TrendingDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import V3Option from '../_shared/V3Option'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Goal & Motivation — green accent (nutrition/outcome). Inert. */
const GOALS = [
    { id: 'losefat', icon: TrendingDown, label: 'Lose fat' },
    { id: 'weight', icon: Target, label: 'Reach goal weight' },
    { id: 'muscle', icon: BicepsFlexed, label: 'Build muscle' },
    { id: 'strength', icon: Dumbbell, label: 'Get stronger' },
    { id: 'health', icon: HeartPulse, label: 'Improve health' },
]

export default function GoalMotivationV3() {
    const colors = useColors()
    const router = useRouter()
    const [selected, setSelected] = useState<string[]>([])
    const accent = colors.text
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
        <V3Screen step={0} eyebrow="Step 1 of 12" title="What are your goals?" subtitle="Pick all that apply — we'll build your whole plan around them." accent={accent} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 12 }}>
                {GOALS.map((g, i) => (
                    <V3Option key={g.id} index={i} icon={g.icon} label={g.label} accent={accent} multiSelect selected={selected.includes(g.id)} onPress={() => toggle(g.id)} />
                ))}
            </View>
        </V3Screen>
    )
}
