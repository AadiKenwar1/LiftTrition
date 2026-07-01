import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Check } from 'lucide-react-native'
import { useMemo, type ComponentType } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from './PressableScale'

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

/**
 * Dev-only shared selectable card for the V3 (black & white) onboarding screens. Neutral surface with a
 * thin border that turns accent when selected; optional leading icon (accent) and trailing check for
 * multi-select. Staggered entrance + press-scale baked in so every V3 list feels identical.
 */
export interface V3OptionProps {
    label: string
    sublabel?: string
    icon?: IconType
    selected: boolean
    accent: string
    onPress: () => void
    multiSelect?: boolean
    index?: number
}

export default function V3Option({ label, sublabel, icon: Icon, selected, accent, onPress, multiSelect, index = 0 }: V3OptionProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(280)}>
            <PressableScale style={[styles.card, selected && { borderColor: accent, backgroundColor: accent + '10' }]} onPress={onPress}>
                {Icon != null && (
                    <View style={[styles.iconBox, { backgroundColor: selected ? accent + '20' : colors.surfaceInset }]}>
                        <Icon size={22} color={selected ? accent : colors.textMuted} strokeWidth={2.2} />
                    </View>
                )}
                <View style={styles.textWrap}>
                    <Text style={[styles.label, selected && { color: colors.text }]}>{label}</Text>
                    {sublabel != null && <Text style={styles.sublabel}>{sublabel}</Text>}
                </View>
                {multiSelect && (
                    <View style={[styles.check, selected && { backgroundColor: accent, borderColor: accent }]}>{selected && <Check size={14} color={colors.background} strokeWidth={3} />}</View>
                )}
            </PressableScale>
        </Animated.View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, borderWidth: 2, borderColor: colors.border },
        iconBox: { width: 44, height: 44, borderRadius: radius.iconTile, justifyContent: 'center', alignItems: 'center' },
        textWrap: { flex: 1, gap: 2 },
        label: { fontFamily: fonts.bold, fontSize: 16, color: colors.textMuted, letterSpacing: -0.3 },
        sublabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.1, lineHeight: 18 },
        check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    })
}
