import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V6 Activity — V5's screen with only the copy changed. V5 said this "sets your daily calorie burn",
 * which overclaims twice: one tap picks a multiplier, and the result is an estimate the app can't verify. The
 * subtitle now says estimate and names who is doing it, so the sentence has an actor. Everything else matches
 * V5: step 3 of 8, still the last tap-only question before the first keyboard, selected frequency highlights
 * workout-blue. Inert.
 */
const FREQUENCIES = [
    { id: 'sedentary', label: 'Sedentary', sub: 'Little to no exercise' },
    { id: 'light', label: 'Light', sub: 'Light exercise 1-3 days a week' },
    { id: 'moderate', label: 'Moderate', sub: 'Moderate exercise 4-5 days a week' },
    { id: 'active', label: 'Active', sub: 'Hard exercise 3-4 days, or moderate 6-7 days a week' },
    { id: 'gymrat', label: 'Gym Rat', sub: 'Intensive exercise 6-7 days a week' },
]

export default function ActivityV6() {
    const colors = useColors()
    const router = useRouter()
    const [selected, setSelected] = useState<string | null>(null)

    return (
        <V4Screen step={2} totalSteps={8} eyebrow="Step 3 of 8" title="How often do you train?" subtitle="We use this to estimate how many calories you burn in a day." accent={colors.text} nextDisabled={selected == null} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 10 }}>
                {FREQUENCIES.map((f, i) => (
                    <V3Option key={f.id} index={i} label={f.label} sublabel={f.sub} accent={colors.workout} selected={selected === f.id} onPress={() => setSelected(f.id)} />
                ))}
            </View>
        </V4Screen>
    )
}
