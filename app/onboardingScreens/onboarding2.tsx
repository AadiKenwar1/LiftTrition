import BirthdayView from '@/components/OnboardingComponents/BirthdayView'
import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

export default function Onboarding2Screen() {
    const { settings, setSettings } = useSettings()
    const [birthDate, setBirthDate] = useState(new Date())

    const calculateAge = (date: Date): number => {
        const today = new Date()
        let age = today.getFullYear() - date.getFullYear()
        const monthDiff = today.getMonth() - date.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
            age--
        }
        return age
    }

    function handleNext() {
        const age = calculateAge(birthDate)
        if (age < 13) {
            Alert.alert('Age Requirement', 'You must be at least 13 years old to use this app.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, birthDate: birthDate })
            router.push('/onboardingScreens/onboarding3')
        }
    }

    return <BirthdayView value={birthDate} onChange={setBirthDate} onNext={handleNext} onBack={() => router.back()} stepIndex={0} />
}
