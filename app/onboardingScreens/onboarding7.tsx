import PaceView from '@/components/OnboardingComponents/PaceView'
import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

export default function Onboarding7Screen() {
    const { settings, setSettings } = useSettings()
    const [goalPace, setGoalPace] = useState(1.0)

    const handleNext = () => {
        if (goalPace < 0.2 || goalPace > 3.0) {
            Alert.alert('Goal Pace Required', 'Please enter a goal pace between 0.2 and 3.0.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, goalPace: goalPace })
            router.push('/onboardingScreens/onboarding8')
        }
    }

    return <PaceView value={goalPace} onChange={setGoalPace} onNext={handleNext} onBack={() => router.back()} stepIndex={5} />
}
