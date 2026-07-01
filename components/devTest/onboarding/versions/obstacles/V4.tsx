import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { CalendarX, Compass, TrendingDown, Utensils } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 Obstacles. Same selection-color pattern as Goal & Motivation: options rest NEUTRAL and reveal
 * their domain color on SELECTION — staying consistent + tracking what I eat highlight green, hitting a
 * plateau + not knowing what to do highlight blue, alternating down the list. Screen chrome stays neutral.
 * Multi-select. Inert.
 */
const OBSTACLES = [
    { id: 'consistency', icon: CalendarX, label: 'Staying consistent', domain: 'nutrition' as const },
    { id: 'plateau', icon: TrendingDown, label: 'Hitting a plateau', domain: 'workout' as const },
    { id: 'diet', icon: Utensils, label: 'Tracking what I eat', domain: 'nutrition' as const },
    { id: 'plan', icon: Compass, label: 'Not knowing what to do', domain: 'workout' as const },
]

export default function ObstaclesV4() {
    const colors = useColors()
    const router = useRouter()
    const [selected, setSelected] = useState<string[]>([])
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
        <V4Screen step={1} totalSteps={9} eyebrow="Step 2 of 9" title="What's held you back before?" subtitle="Pick anything that fits — we'll tailor your plan to get past it." accent={colors.text} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 12 }}>
                {OBSTACLES.map((o, i) => (
                    <V3Option key={o.id} index={i} icon={o.icon} label={o.label} accent={o.domain === 'workout' ? colors.workout : colors.nutrition} multiSelect selected={selected.includes(o.id)} onPress={() => toggle(o.id)} />
                ))}
            </View>
        </V4Screen>
    )
}
