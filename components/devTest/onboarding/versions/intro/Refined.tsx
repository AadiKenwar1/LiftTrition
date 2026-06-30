import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { BarChart2, Dumbbell, Sparkle, Star, Zap } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Dev-only Refined version of the Intro screen — restyled per RESTYLE_PLAN (theme tokens, dark + light)
 * with an outcome-led headline + a social-proof line (cro). Self-contained / inert.
 */
export default function IntroRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()

    const CARDS = [
        { icon: Dumbbell, title: 'Train Harder', body: 'Log workouts &\nbuild routines', accent: colors.workout },
        { icon: Sparkle, title: 'Eat Smarter', body: 'AI-assisted nutrition\ntracking', accent: colors.nutrition },
        { icon: BarChart2, title: 'See Progress', body: 'Strength, macros,\nbodyweight trends', accent: colors.workout },
        { icon: Zap, title: 'Real Results', body: 'Built for real,\nconsistent results', accent: colors.nutrition },
    ]

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.workout + '14', 'transparent']} style={styles.topGradient} pointerEvents="none" />

            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 12) + 24, paddingBottom: 16 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.iconCircle}>
                    <Image source={require('@/assets/images/AppIconPng.png')} style={styles.logoImage} contentFit="contain" priority="high" />
                </View>

                <Text style={styles.appName}>LIFTRI</Text>
                <Text style={styles.tagline}>Hit your goals with training and nutrition that finally work together.</Text>

                {/* Social proof (cro) — placeholder rating */}
                <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} color="#FFD93D" fill="#FFD93D" strokeWidth={0} />
                    ))}
                    <Text style={styles.ratingText}>4.8 · loved by thousands</Text>
                </View>

                <View style={styles.grid}>
                    {CARDS.map(({ icon: Icon, title, body, accent }, i) => (
                        <Animated.View key={title} entering={FadeInDown.delay(i * 60).duration(300)} style={styles.card}>
                            <View style={[styles.cardIconBox, { backgroundColor: accent + '22' }]}>
                                <Icon size={22} color={accent} strokeWidth={2} />
                            </View>
                            <Text style={styles.cardTitle}>{title}</Text>
                            <Text style={styles.cardBody}>{body}</Text>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => {}}>
                    <Text style={styles.ctaText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
        scroll: { flex: 1 },
        scrollContent: { flexGrow: 1, width: '100%', alignItems: 'center', paddingHorizontal: 25, justifyContent: 'center' },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border, marginBottom: 8, overflow: 'hidden' },
        logoImage: { width: '85%', height: '85%' },
        appName: { fontFamily: fonts.extrabold, fontSize: 40, color: colors.text, letterSpacing: -1.2, textAlign: 'center' },
        tagline: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, letterSpacing: 0.1, marginTop: 4, marginBottom: 10, paddingHorizontal: 8 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 18 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
        grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
        card: { width: '47.5%', backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        cardIconBox: { width: 40, height: 40, borderRadius: radius.iconTile, justifyContent: 'center', alignItems: 'center' },
        cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, letterSpacing: -0.3 },
        cardBody: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, letterSpacing: 0.1, lineHeight: 17 },
        buttonContainer: { paddingHorizontal: 25, paddingTop: 12 },
        ctaButton: { width: '100%', minHeight: 60, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
