import GoalView, { type GoalType } from '@/components/OnboardingComponents/GoalView'
import { useSettings } from '@/context/SettingsContext'
import { validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { router } from 'expo-router'
import { useState } from 'react'

export default function Onboarding6Screen() {
    const { settings, setSettings } = useSettings()
    const [goal, setGoal] = useState<GoalType | null>('maintain')
    const [targetWeight, setTargetWeight] = useState('')

    function handleNext() {
        if (goal === 'maintain') {
            setSettings({
                ...settings,
                goalType: 'maintain',
                goalWeight: settings.bodyWeight,
            })
            router.push('/onboardingScreens/onboarding8')
        } else {
            if (!validateTargetWeight(Number(targetWeight), settings.bodyWeight, goal, settings.unitSystem)) return
            setSettings({
                ...settings,
                goalType: goal as 'lose' | 'gain',
                goalWeight: Number(targetWeight),
            })
            router.push('/onboardingScreens/onboarding7')
        }
    }

    return <GoalView value={goal} onChange={setGoal} targetWeight={targetWeight} onTargetWeightChange={setTargetWeight} unitSystem={settings.unitSystem} onNext={handleNext} onBack={() => router.back()} stepIndex={4} />
}
