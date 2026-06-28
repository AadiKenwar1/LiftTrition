import SummaryView from '@/components/OnboardingComponents/SummaryView'
import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'

export default function Onboarding8Screen() {
    const { settings, setSettings, calculateMacros } = useSettings()

    const handleNext = () => {
        const macros = calculateMacros(settings, settings.unitSystem === 'imperial')
        setSettings({
            ...settings,
            calorieGoal: macros.calResult,
            proteinGoal: macros.proteinGrams,
            carbsGoal: macros.carbGrams,
            fatsGoal: macros.fatGrams,
        })

        router.push('/onboardingScreens/onboarding9')
    }

    return (
        <SummaryView
            data={{
                birthDate: settings.birthDate,
                gender: settings.gender,
                unitSystem: settings.unitSystem,
                height: settings.height,
                bodyWeight: settings.bodyWeight,
                activityLevel: settings.activityLevel,
                goalType: settings.goalType,
                goalWeight: settings.goalWeight,
                goalPace: settings.goalPace,
            }}
            onNext={handleNext}
            onBack={() => router.back()}
            stepIndex={6}
        />
    )
}
