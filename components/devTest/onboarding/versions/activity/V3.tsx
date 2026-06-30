import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import V3Option from '../_shared/V3Option'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Activity — blue accent (training). Inert. */
const FREQUENCIES = [
    { id: 'sedentary', label: 'Sedentary', sub: 'Little to no exercise' },
    { id: 'light', label: 'Light', sub: 'Light exercise 1-3 days a week' },
    { id: 'moderate', label: 'Moderate', sub: 'Moderate exercise 4-5 days a week' },
    { id: 'active', label: 'Active', sub: 'Hard exercise 3-4 days, or moderate 6-7 days a week' },
    { id: 'gymrat', label: 'Gym Rat', sub: 'Intensive exercise 6-7 days a week' },
]

export default function ActivityV3() {
    const colors = useColors()
    const router = useRouter()
    const [selected, setSelected] = useState<string | null>(null)
    const accent = colors.text

    return (
        <V3Screen step={5} eyebrow="Step 6 of 12" title="How active are you?" subtitle="This sets your daily calorie burn so your targets are realistic." accent={accent} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 10 }}>
                {FREQUENCIES.map((f, i) => (
                    <V3Option key={f.id} index={i} label={f.label} sublabel={f.sub} accent={colors.workout} selected={selected === f.id} onPress={() => setSelected(f.id)} />
                ))}
            </View>
        </V3Screen>
    )
}
