import { fonts, radius, useColorScheme, useColors, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Dumbbell, Moon, Sparkles, Star, Sun } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'

/**
 * Dev-only login variant — VALUE-led. The name is a small eyebrow; the hero is the promise, with two
 * domain chips (blue training / green nutrition) making the dual-mode identity concrete without an icon.
 * Apple button mocks sign-in; rating is a PLACEHOLDER.
 */
export default function LoginValueProp() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad(12)
    const flow = useOnboardingFlow()
    const scheme = useColorScheme()
    const setScheme = useSetColorScheme()

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: topPad }]}>
                <TouchableOpacity style={styles.toggle} onPress={() => setScheme(scheme === 'dark' ? 'light' : 'dark')} activeOpacity={0.7}>
                    {scheme === 'dark' ? <Sun size={20} color={colors.text} strokeWidth={2.2} /> : <Moon size={20} color={colors.text} strokeWidth={2.2} />}
                </TouchableOpacity>
            </View>

            <View style={styles.hero}>
                <Text style={styles.eyebrow}>PLATZE</Text>
                <Text style={styles.headline}>Train and eat with one plan.</Text>
                <Text style={styles.sub}>Progressive workouts and AI nutrition tracking, finally in sync.</Text>

                <View style={styles.chipRow}>
                    <View style={styles.chip}>
                        <Dumbbell size={16} color={colors.workout} strokeWidth={2.4} />
                        <Text style={styles.chipText}>Training</Text>
                    </View>
                    <View style={styles.chip}>
                        <Sparkles size={16} color={colors.nutrition} strokeWidth={2.4} />
                        <Text style={styles.chipText}>Nutrition</Text>
                    </View>
                </View>

                <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} color="#FFD93D" fill="#FFD93D" strokeWidth={0} />
                    ))}
                    <Text style={styles.ratingText}>5.0</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.appleButton} onPress={() => flow?.goNext()} activeOpacity={0.85}>
                    <Ionicons name="logo-apple" size={19} color={colors.background} style={{ marginRight: 8, marginTop: -2 }} />
                    <Text style={styles.appleText}>Sign in with Apple</Text>
                </TouchableOpacity>
                <Text style={styles.legal}>By continuing you agree to our Terms & Privacy Policy.</Text>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
        toggle: { width: 42, height: 42, borderRadius: radius.iconButton, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, justifyContent: 'center', alignItems: 'center' },
        hero: { flex: 1, justifyContent: 'center' },
        eyebrow: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.textMuted, letterSpacing: 2, marginBottom: 16 },
        headline: { fontFamily: fonts.extrabold, fontSize: 40, color: colors.text, letterSpacing: -1.2, lineHeight: 44 },
        sub: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, lineHeight: 23, marginTop: 12, marginBottom: 22 },
        chipRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
        chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, height: 40, borderRadius: radius.chip, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, letterSpacing: -0.2 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
        footer: { gap: 14 },
        appleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: radius.cardLg, backgroundColor: colors.text },
        appleText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
        legal: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 16 },
    })
}
