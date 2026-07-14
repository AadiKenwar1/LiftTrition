import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { BarChart2, Dumbbell, Sparkle, Star, Zap } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/** Dev-only V3 (black & white) Intro — neutral canvas, green + blue only in the feature icons. Inert. */
export default function IntroV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad(24)
    const flow = useOnboardingFlow()
    const logo = useColorScheme() === 'light' ? require('@/assets/images/LightModeLogo.png') : require('@/assets/images/AppIconPng.png')

    const CARDS = [
        { icon: Dumbbell, title: 'Train', body: 'Log workouts &\nbuild routines' },
        { icon: Sparkle, title: 'Eat smart', body: 'AI-assisted\nnutrition tracking' },
        { icon: BarChart2, title: 'Progress', body: 'Strength, macros,\nweight trends' },
        { icon: Zap, title: 'Results', body: 'Built for real,\nconsistent results' },
    ]

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: topPad }]} showsVerticalScrollIndicator={false}>
                <Image source={logo} style={styles.logo} contentFit="contain" priority="high" />
                <Text style={styles.appName}>PLATES</Text>
                <Text style={styles.tagline}>Training and nutrition that finally work together.</Text>

                <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} color="#FFD93D" fill="#FFD93D" strokeWidth={0} />
                    ))}
                    <Text style={styles.ratingText}>4.8 · loved by thousands</Text>
                </View>

                <View style={styles.grid}>
                    {CARDS.map(({ icon: Icon, title, body }, i) => (
                        <Animated.View key={title} entering={FadeInDown.delay(i * 60).duration(300)} style={styles.card}>
                            <Icon size={22} color={colors.textMuted} strokeWidth={2.2} />
                            <Text style={styles.cardTitle}>{title}</Text>
                            <Text style={styles.cardBody}>{body}</Text>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.cta} onPress={() => flow?.goNext()} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>Get started</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        scroll: { flex: 1 },
        content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 16 },
        logo: { width: 96, height: 96, marginBottom: 12 },
        appName: { fontFamily: fonts.extrabold, fontSize: 40, color: colors.text, letterSpacing: -1.4, textAlign: 'center' },
        tagline: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 4, marginBottom: 12, paddingHorizontal: 12 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
        grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        card: { width: '47.5%', backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, letterSpacing: -0.3, marginTop: 2 },
        cardBody: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
        footer: { paddingTop: 12 },
        cta: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
