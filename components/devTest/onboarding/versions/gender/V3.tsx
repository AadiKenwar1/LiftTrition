import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import V3Option from '../_shared/V3Option'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Biological Sex — blue accent (body data). Inert. */
export default function GenderV3() {
    const colors = useColors()
    const router = useRouter()
    const [value, setValue] = useState<'male' | 'female' | null>(null)
    const accent = colors.text

    return (
        <V3Screen step={4} eyebrow="Step 5 of 12" title="What's your biological sex?" subtitle="This helps us dial in your calorie and macro targets." accent={accent} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 12 }}>
                <V3Option index={0} label="Male" accent={accent} selected={value === 'male'} onPress={() => setValue('male')} />
                <V3Option index={1} label="Female" accent={accent} selected={value === 'female'} onPress={() => setValue('female')} />
            </View>
        </V3Screen>
    )
}
