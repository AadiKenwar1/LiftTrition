import GenderView from '@/components/OnboardingComponents/GenderView'
import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

export default function Onboarding3Screen() {
    const { settings, setSettings } = useSettings()
    const [selectedSex, setSelectedSex] = useState<'male' | 'female' | null>(null)

    function handleNext() {
        if (selectedSex === null) {
            Alert.alert('Gender Selection Required', 'Please select your biological sex.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, gender: selectedSex })
            router.push('/onboardingScreens/onboarding4')
        }
    }

    return <GenderView value={selectedSex} onChange={setSelectedSex} onNext={handleNext} onBack={() => router.back()} stepIndex={1} />
}
