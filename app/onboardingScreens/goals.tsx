import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import OptionCard from '@/components/NeutralComponents/OptionCard'
import { useSettings } from '@/context/SettingsContext'
import { useColors } from '@/context/ThemeContext'
import { onboardingStep } from '@/lib/onboarding/steps'
import { router } from 'expo-router'
import { BicepsFlexed, Dumbbell, HeartPulse, Target, TrendingDown } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

/** Onboarding — goals (flavor, not persisted). Domain color reveals on selection. Entry screen (no Back). */
const GOALS = [
    { id: 'losefat', icon: TrendingDown, label: 'Lose fat', domain: 'nutrition' as const },
    { id: 'muscle', icon: BicepsFlexed, label: 'Build muscle', domain: 'workout' as const },
    { id: 'weight', icon: Target, label: 'Reach goal weight', domain: 'nutrition' as const },
    { id: 'strength', icon: Dumbbell, label: 'Get stronger', domain: 'workout' as const },
    { id: 'health', icon: HeartPulse, label: 'Improve health', domain: 'nutrition' as const },
]

export default function OnboardingGoals() {
    const colors = useColors()
    const { settings } = useSettings()
    const [selected, setSelected] = useState<string[]>([])
    const { current, total } = onboardingStep('goals', settings.goalType)
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
        <OnboardingScaffold step={current} total={total} title="What are your goals?" subtitle="Pick all that apply — we'll build your whole plan around them." nextDisabled={selected.length === 0} onNext={() => router.push('/onboardingScreens/obstacles')}>
            <View style={{ gap: 12 }}>
                {GOALS.map((g, i) => (
                    <OptionCard key={g.id} index={i} icon={g.icon} label={g.label} accent={g.domain === 'workout' ? colors.workout : colors.nutrition} multiSelect selected={selected.includes(g.id)} onPress={() => toggle(g.id)} />
                ))}
            </View>
        </OnboardingScaffold>
    )
}
