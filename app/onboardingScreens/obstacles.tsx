import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import OptionCard from '@/components/NeutralComponents/OptionCard'
import { useSettings } from '@/context/SettingsContext'
import { useColors } from '@/context/ThemeContext'
import { onboardingStep } from '@/lib/utils/onboardingSteps'
import { router } from 'expo-router'
import { Ban, CalendarX, Compass, TrendingDown, Utensils } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

/** Onboarding — obstacles (flavor, not persisted). "None of these" is mutually exclusive with the rest. */
const OBSTACLES = [
    { id: 'consistency', icon: CalendarX, label: 'Staying consistent', domain: 'nutrition' as const },
    { id: 'plateau', icon: TrendingDown, label: 'Hitting a plateau', domain: 'workout' as const },
    { id: 'diet', icon: Utensils, label: 'Tracking what I eat', domain: 'nutrition' as const },
    { id: 'plan', icon: Compass, label: 'Not knowing what to do', domain: 'workout' as const },
]

export default function OnboardingObstacles() {
    const colors = useColors()
    const { settings } = useSettings()
    const [selected, setSelected] = useState<string[]>([])
    const { current, total } = onboardingStep('obstacles', settings.goalType)
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.filter((x) => x !== 'none'), id]))
    const toggleNone = () => setSelected((s) => (s.includes('none') ? [] : ['none']))

    return (
        <OnboardingScaffold step={current} total={total} title="What's held you back before?" subtitle="Pick anything that fits — we'll tailor your plan to get past it." nextDisabled={selected.length === 0} onBack={() => router.back()} onNext={() => router.push('/onboardingScreens/aboutYou')}>
            <View style={{ gap: 12 }}>
                {OBSTACLES.map((o, i) => (
                    <OptionCard key={o.id} index={i} icon={o.icon} label={o.label} accent={o.domain === 'workout' ? colors.workout : colors.nutrition} multiSelect selected={selected.includes(o.id)} onPress={() => toggle(o.id)} />
                ))}
                <OptionCard index={OBSTACLES.length} icon={Ban} label="None of these" accent={colors.text} multiSelect selected={selected.includes('none')} onPress={toggleNone} />
            </View>
        </OnboardingScaffold>
    )
}
