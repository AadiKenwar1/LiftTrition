import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { BarChart2, Dumbbell, Sparkle, Zap } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const BLUE = '#2f80ed'
const GREEN = '#22C922'

const CARDS = [
    { icon: Dumbbell, title: 'Train Harder', body: 'Log workouts &\nbuild routines', accent: BLUE },
    { icon: Sparkle, title: 'Eat Smarter', body: 'AI-assisted nutrition\ntracking', accent: GREEN },
    { icon: BarChart2, title: 'See Progress', body: 'Strength, macros\nbodyweight trends, and more', accent: BLUE },
    { icon: Zap, title: 'Real Results', body: 'Built for real,\nconsistent results', accent: GREEN },
]

export default function IntroductionScreen() {
    const router = useRouter()
    const insets = useSafeAreaInsets()

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />

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
                {/* Hero circle — matches onboarding 2-9 */}
                <View style={styles.iconCircle}>
                    <Image source={require('@/assets/images/AppIconPng.png')} style={styles.logoImage} contentFit="contain" priority="high" />
                </View>

                {/* App name + tagline */}
                <Text style={styles.appName}>LiftTrition</Text>
                <Text style={styles.tagline}>Training, Nutrition, and Progress. Built together.</Text>

                {/* 2×2 feature cards */}
                <View style={styles.grid}>
                    {CARDS.map(({ icon: Icon, title, body, accent }) => (
                        <View key={title} style={styles.card}>
                            <View style={[styles.cardIconBox, { backgroundColor: accent + '22' }]}>
                                <Icon size={22} color={accent} strokeWidth={2} />
                            </View>
                            <Text style={styles.cardTitle}>{title}</Text>
                            <Text style={styles.cardBody}>{body}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => router.push('/onboardingScreens/preboard')}>
                    <Text style={styles.ctaText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#101010',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
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
        marginBottom: 8,
        overflow: 'hidden',
    },
    logoImage: {
        width: '85%',
        height: '85%',
    },
    appName: {
        fontSize: 40,
        color: '#fff',
        letterSpacing: -1.2,
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
        marginBottom: 0,
    },
    tagline: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.1,
        fontFamily: 'Poppins_400Regular',
        marginBottom: 18,
    },
    grid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 8,
    },
    card: {
        width: '47.5%',
        backgroundColor: '#1e1e1e',
        borderRadius: 14,
        padding: 16,
        gap: 8,
        borderWidth: 0,
        borderColor: '#222',
    },
    cardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 15,
        color: '#fff',
        letterSpacing: -0.3,
        fontFamily: 'Poppins_600SemiBold',
    },
    cardBody: {
        fontSize: 12,
        color: '#aaa',
        letterSpacing: 0.1,
        lineHeight: 17,
        fontFamily: 'Poppins_400Regular',
    },
    buttonContainer: {
        paddingHorizontal: 25,
        paddingTop: 12,
    },
    ctaButton: {
        width: '100%',
        minHeight: 60,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    ctaText: {
        fontSize: 17,
        color: '#000',
        letterSpacing: -0.3,
        fontFamily: 'Poppins_600SemiBold',
    },
})
