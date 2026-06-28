import HeightWeightView, { type HeightWeightPayload } from '@/components/OnboardingComponents/HeightWeightView'
import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { router } from 'expo-router'

export default function Onboarding4Screen() {
    const { settings, setSettings, handleUpdateBw } = useSettings()

    function handleNext({ height, bodyWeight, unitSystem }: HeightWeightPayload) {
        if (!validateHeightWeight(height, bodyWeight, unitSystem)) {
            return
        }
        setSettings({
            ...settings,
            height: height,
            bodyWeight: bodyWeight,
            unitSystem: unitSystem,
        })
        handleUpdateBw(bodyWeight)
        router.push('/onboardingScreens/onboarding5')
    }

    return <HeightWeightView onNext={handleNext} onBack={() => router.back()} stepIndex={2} />
}
