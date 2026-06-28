import { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import MacrosView from '@/components/OnboardingComponents/MacrosView'
import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'

export default function Onboarding9Screen() {
    const { settings, setSettings } = useSettings()

    const handleSaveMacro = (kind: MacroGoalKind, value: number) => {
        if (kind === 'calories') setSettings({ ...settings, calorieGoal: value })
        else if (kind === 'protein') setSettings({ ...settings, proteinGoal: value })
        else if (kind === 'carbs') setSettings({ ...settings, carbsGoal: value })
        else setSettings({ ...settings, fatsGoal: value })
    }

    return (
        <MacrosView
            macros={{ calorieGoal: settings.calorieGoal, proteinGoal: settings.proteinGoal, carbsGoal: settings.carbsGoal, fatsGoal: settings.fatsGoal }}
            onSaveMacro={handleSaveMacro}
            onNext={() => router.push('/onboardingScreens/onboarding10')}
            onBack={() => router.back()}
        />
    )
}
