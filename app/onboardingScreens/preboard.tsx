import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Activity, Ruler, SlidersHorizontal, Target } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const HEADLINE = 'Before we get started...'
const PURPOSE = 'We just need a few details to personalize macronutrient goals and recovery targets to you'
const STEPS = [
    { icon: Ruler, label: 'Body stats', sub: 'Age, sex,\nheight & weight', color: '#FBBF24' },
    { icon: Activity, label: 'Activity', sub: 'Your day-to-\nday lifestyle', color: '#2f80ed' },
    { icon: Target, label: 'Goals', sub: 'What you\nwant to achieve', color: '#22C922' },
]
const FOOTNOTE = '2 minutes  ·  Your data is never sold or shared'
const CTA_LABEL = "Let's Go"

export default function PreboardScreen() {
    const insets = useSafeAreaInsets()

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.12)', 'transparent']} style={styles.topGradient} pointerEvents="none" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: Math.max(insets.top, 12) + 24,
                        paddingBottom: 16,
                    },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Hero icon */}
                <View style={styles.iconCircle}>
                    <SlidersHorizontal size={72} color="#fff" strokeWidth={1.8} />
                </View>

                {/* Headline */}
                <Text style={styles.headlineText}>{HEADLINE}</Text>

                {/* Purpose */}
                <Text style={styles.purposeText}>{PURPOSE}</Text>

                {/* 3-column step cards */}
                <View style={styles.stepsRow}>
                    {STEPS.map(({ icon: Icon, label, sub, color }) => (
                        <View key={label} style={styles.stepCard}>
                            <View style={[styles.stepIconBox, { backgroundColor: color + '22' }]}>
                                <Icon size={20} color={color} strokeWidth={2} />
                            </View>
                            <Text style={styles.stepLabel}>{label}</Text>
                            <Text style={styles.stepSub}>{sub}</Text>
                        </View>
                    ))}
                </View>

                {/* Footnote */}
                <Text style={styles.footnoteText}>{FOOTNOTE}</Text>
            </ScrollView>

            <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => router.push('/onboardingScreens/onboarding2')}>
                    <Text style={styles.ctaText}>{CTA_LABEL}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 280,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 25,
        justifyContent: 'center',
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3a3a3a',
        marginBottom: 28,
    },
    headlineText: {
        fontSize: 40,
        color: '#fff',
        letterSpacing: -1.2,
        marginBottom: 14,
        fontFamily: 'Poppins_700Bold',
        lineHeight: 48,
        textAlign: 'center',
    },
    purposeText: {
        fontSize: 15,
        color: '#aaa',
        lineHeight: 23,
        letterSpacing: 0.1,
        marginBottom: 32,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    stepsRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
        marginBottom: 28,
    },
    stepCard: {
        flex: 1,
        backgroundColor: '#1e1e1e',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 8,
    },
    stepIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepLabel: {
        fontSize: 13,
        color: '#fff',
        letterSpacing: -0.2,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    stepSub: {
        fontSize: 11,
        color: '#aaa',
        letterSpacing: 0.1,
        lineHeight: 16,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
    },
    footnoteText: {
        fontSize: 12,
        color: '#888',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 25,
        paddingTop: 12,
    },
    backButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#1e1e1e',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#242424',
    },
    backButtonText: {
        fontSize: 17,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    ctaButton: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaText: {
        fontSize: 17,
        color: '#000',
        letterSpacing: -0.3,
        fontFamily: 'Poppins_600SemiBold',
    },
})
