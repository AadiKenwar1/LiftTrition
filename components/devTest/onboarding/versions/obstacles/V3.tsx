import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { CalendarX, Salad, TrendingDown, Utensils } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import V3Option from '../_shared/V3Option'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Obstacles — blue accent (behaviour/training). Multi-select. Inert. */
const OBSTACLES = [
    { id: 'consistency', icon: CalendarX, label: 'Staying consistent' },
    { id: 'plateau', icon: TrendingDown, label: 'Hitting a plateau' },
    { id: 'diet', icon: Utensils, label: 'Tracking what I eat' },
    { id: 'plan', icon: Salad, label: 'Not knowing what to do' },
]

export default function ObstaclesV3() {
    const colors = useColors()
    const router = useRouter()
    const [selected, setSelected] = useState<string[]>([])
    const accent = colors.text
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
        <V3Screen step={1} eyebrow="Step 2 of 12" title="What's held you back before?" subtitle="Pick anything that fits — we'll tailor your plan to get past it." accent={accent} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 12 }}>
                {OBSTACLES.map((o, i) => (
                    <V3Option key={o.id} index={i} icon={o.icon} label={o.label} accent={accent} multiSelect selected={selected.includes(o.id)} onPress={() => toggle(o.id)} />
                ))}
            </View>
        </V3Screen>
    )
}
