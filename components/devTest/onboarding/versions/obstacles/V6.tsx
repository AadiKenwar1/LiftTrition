import { useColors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { Ban, CalendarX, Compass, TrendingDown, Utensils } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V6 Obstacles — V5's screen with only the copy changed. V5 promised "we'll tailor your plan to get
 * past it", which nothing delivers: like the step-1 goals, the selection reaches the flow bag and no screen
 * reads it. Step 1 keeps its promise as flavour and this one drops it, because an obstacle is the least
 * actionable answer in the flow and the payoff would be the vaguest. "Sounds familiar" replaces "fits" so the
 * ask reads as recognition rather than as another field to fill, and losing the em dash stops this subtitle
 * and step 1's from sharing one shape. Step 2 of 8. Multi-select. Inert.
 */
const OBSTACLES = [
    { id: 'consistency', icon: CalendarX, label: 'Staying consistent', domain: 'nutrition' as const },
    { id: 'plateau', icon: TrendingDown, label: 'Hitting a plateau', domain: 'workout' as const },
    { id: 'diet', icon: Utensils, label: 'Tracking what I eat', domain: 'nutrition' as const },
    { id: 'plan', icon: Compass, label: 'Not knowing what to do', domain: 'workout' as const },
]

export default function ObstaclesV6() {
    const colors = useColors()
    const router = useRouter()
    const flow = useOnboardingFlow()
    const [selected, setSelected] = useState<string[]>([])

    const commit = (next: string[]) => {
        setSelected(next)
        flow?.setData('obstacles', next.join(','))
    }
    const toggle = (id: string) => commit(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected.filter((x) => x !== 'none'), id])
    const toggleNone = () => commit(selected.includes('none') ? [] : ['none'])

    return (
        <V4Screen step={1} totalSteps={8} eyebrow="Step 2 of 8" title="What's held you back before?" subtitle="Pick anything that sounds familiar." accent={colors.text} nextDisabled={selected.length === 0} onBack={() => router.back()} onNext={() => {}}>
            <View style={{ gap: 12 }}>
                {OBSTACLES.map((o, i) => (
                    <V3Option key={o.id} index={i} icon={o.icon} label={o.label} accent={o.domain === 'workout' ? colors.workout : colors.nutrition} multiSelect selected={selected.includes(o.id)} onPress={() => toggle(o.id)} />
                ))}
                <V3Option index={OBSTACLES.length} icon={Ban} label="None of these" accent={colors.text} multiSelect selected={selected.includes('none')} onPress={toggleNone} />
            </View>
        </V4Screen>
    )
}
