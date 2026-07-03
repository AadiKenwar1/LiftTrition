import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import OptionCard from '@/components/NeutralComponents/OptionCard'
import { useSettings } from '@/context/SettingsContext'
import { useColors } from '@/context/ThemeContext'
import { onboardingStep } from '@/lib/onboarding/steps'
import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat'

/** Onboarding — activity level (blue selected). Persists activityLevel (feeds TDEE + fatigue budget). */
const FREQUENCIES: { id: ActivityLevel; label: string; sub: string }[] = [
    { id: 'sedentary', label: 'Sedentary', sub: 'Little to no exercise' },
    { id: 'light', label: 'Light', sub: 'Light exercise 1-3 days a week' },
    { id: 'moderate', label: 'Moderate', sub: 'Moderate exercise 4-5 days a week' },
    { id: 'active', label: 'Active', sub: 'Hard exercise 3-4 days, or moderate 6-7 days a week' },
    { id: 'gymrat', label: 'Gym Rat', sub: 'Intensive exercise 6-7 days a week' },
]

export default function OnboardingActivity() {
    const colors = useColors()
    const { settings, setSettings } = useSettings()
    const [selected, setSelected] = useState<ActivityLevel | null>(null)
    const { current, total } = onboardingStep('activity', settings.goalType)

    function handleNext() {
        if (selected == null) return
        setSettings({ ...settings, activityLevel: selected })
        router.push('/onboardingScreens/goal')
    }

    return (
        <OnboardingScaffold step={current} total={total} title="How active are you?" subtitle="This sets your daily calorie burn so your targets are realistic." accent={colors.text} nextDisabled={selected == null} onBack={() => router.back()} onNext={handleNext}>
            <View style={{ gap: 10 }}>
                {FREQUENCIES.map((f, i) => (
                    <OptionCard key={f.id} index={i} label={f.label} sublabel={f.sub} accent={colors.workout} selected={selected === f.id} onPress={() => setSelected(f.id)} />
                ))}
            </View>
        </OnboardingScaffold>
    )
}
