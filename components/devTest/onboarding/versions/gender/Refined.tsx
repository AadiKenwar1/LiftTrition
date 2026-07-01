import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import Octicons from '@expo/vector-icons/Octicons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/** Dev-only Refined Gender screen — restyled per RESTYLE_PLAN (theme tokens, dark + light). Inert. */
export default function GenderRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [value, setValue] = useState<'male' | 'female' | null>(null)

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '14', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={4} total={12} accent={accent} />

                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <Octicons name="person-fill" size={65} color={accent} />
                </View>

                <Text style={styles.titleText}>What is your {'\n'}Biological Sex?</Text>
                <Text style={styles.subtitleText}>We use your biological sex for BMR and nutrition goal calculations.</Text>

                <View style={styles.genderContainer}>
                    {(['male', 'female'] as const).map((g, i) => (
                        <Animated.View key={g} entering={FadeInDown.delay(i * 50).duration(280)} style={{ flex: 1 }}>
                            <PressableScale style={[styles.genderButton, value === g && { borderColor: accent }]} onPress={() => setValue(g)}>
                                <View style={[styles.genderIconCircle, value === g && { backgroundColor: accent + '2E' }]}>
                                    <Text style={[styles.genderIcon, value === g && { color: accent }]}>{g === 'male' ? '♂' : '♀'}</Text>
                                </View>
                                <Text style={[styles.genderText, value === g && { color: colors.text }]}>{g === 'male' ? 'Male' : 'Female'}</Text>
                            </PressableScale>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 25, paddingBottom: 50 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', paddingBottom: 16 },
        stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
        stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ringTrack },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 25, color: colors.text, letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, letterSpacing: 0.2, marginBottom: 16, paddingHorizontal: 16 },
        genderContainer: { flexDirection: 'row', width: '100%', gap: 16, marginBottom: 24 },
        genderButton: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: '25%', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, gap: 12 },
        genderIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.surfaceInset, justifyContent: 'center', alignItems: 'center' },
        genderIcon: { fontFamily: fonts.semibold, fontSize: 35, color: colors.textMuted },
        genderText: { fontFamily: fonts.semibold, fontSize: 22, color: colors.textMuted, letterSpacing: -0.5 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.5 },
    })
}
