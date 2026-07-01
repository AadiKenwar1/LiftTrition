import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { Activity, Ruler, ShieldCheck, Target } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Preboard — neutral, green + blue only in the step icons. Inert. */
export default function PreboardV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()

    const STEPS = [
        { icon: Ruler, label: 'Body stats', sub: 'Age, sex,\nheight & weight', color: colors.textMuted },
        { icon: Activity, label: 'Activity', sub: 'Your day-to-\nday lifestyle', color: colors.textMuted },
        { icon: Target, label: 'Goals', sub: 'What you\nwant to achieve', color: colors.textMuted },
    ]

    return (
        <V3Screen title="Before we start" subtitle="We just need a few details to personalize your goals — takes about 2 minutes." onBack={() => router.back()} onNext={() => {}} nextLabel="Let's go">
            <View style={styles.row}>
                {STEPS.map(({ icon: Icon, label, sub, color }, i) => (
                    <Animated.View key={label} entering={FadeInDown.delay(i * 70).duration(300)} style={styles.card}>
                        <View style={[styles.iconBox, { backgroundColor: color + '1A' }]}>
                            <Icon size={20} color={color} strokeWidth={2.2} />
                        </View>
                        <Text style={styles.label}>{label}</Text>
                        <Text style={styles.sub}>{sub}</Text>
                    </Animated.View>
                ))}
            </View>

            <View style={styles.trustRow}>
                <ShieldCheck size={15} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.trustText}>Your data is never sold or shared</Text>
            </View>
        </V3Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
        card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        iconBox: { width: 40, height: 40, borderRadius: radius.iconTile, justifyContent: 'center', alignItems: 'center' },
        label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, letterSpacing: -0.2, textAlign: 'center' },
        sub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, lineHeight: 16, textAlign: 'center' },
        trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
        trustText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
    })
}
