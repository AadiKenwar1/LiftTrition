import ActivityView, { type ActivityLevel } from '@/components/OnboardingComponents/ActivityView'
import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

export default function Onboarding5Screen() {
    const { settings, setSettings } = useSettings()
    const [selectedFrequency, setSelectedFrequency] = useState<ActivityLevel | null>(null)

    function handleNext() {
        if (selectedFrequency === null) {
            Alert.alert('Training Frequency Required', 'Please select your training frequency.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, activityLevel: selectedFrequency })
            router.push('/onboardingScreens/onboarding6')
        }
    }

    return <ActivityView value={selectedFrequency} onChange={setSelectedFrequency} onNext={handleNext} onBack={() => router.back()} stepIndex={3} />
}
