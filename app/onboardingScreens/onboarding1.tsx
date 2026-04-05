import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { BarChart2, Dumbbell, Scale, Sparkle } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const BLUE = '#2f80ed'
const GREEN = '#22C922'

const features = [
    { icon: Dumbbell, text: 'Simple, customizable, and effective workout and nutrition tracking in one place', accent: BLUE },
    { icon: Sparkle, text: 'AI features and an extensive food database to make tracking easy', accent: GREEN },
    { icon: BarChart2, text: 'Insights on your progress through understandable visualizations', accent: BLUE },
    { icon: Scale, text: 'The platform to achieve and CRUSH your fitness goals', accent: GREEN },
]

export default function Onboarding1Screen() {
    const router = useRouter()

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.2)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <Text style={styles.titleText}>LiftTrition</Text>
                <Text style={styles.subtitleText}>LiftTrition is a free to use fitness platform that offers the following:</Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                    {features.map(({ icon: Icon, text, accent }, i) => (
                        <View key={i} style={styles.featureCard}>
                            <View style={[styles.featureIconBox, { backgroundColor: accent + '20' }]}>
                                <Icon size={20} color={accent} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.featureText}>{text}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.footerHint}>If this sounds like something you're interested in, let's get started! We just need to ask a few quick questions to personalize your goals.</Text>
            </ScrollView>

            <View style={styles.ctaBar}>
                <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => router.push('/onboardingScreens/onboarding2')}>
                    <Text style={styles.ctaText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 70,
        paddingBottom: 50,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 16,
    },
    titleText: {
        fontSize: 52,
        color: '#fff',
        letterSpacing: -1.5,
        marginBottom: 0,
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
    },
    subtitleText: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 23,
        letterSpacing: 0.1,
        marginBottom: 16,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    featuresContainer: {
        width: '100%',
        gap: 10,
        marginBottom: 16,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        height: 85,
        backgroundColor: '#282A2C',
        borderRadius: 14,
        paddingHorizontal: 16,
        borderWidth: 0,
        borderColor: '#222',
    },
    featureIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    featureText: {
        flex: 1,
        fontSize: 14,
        color: '#fff',
        letterSpacing: -0.2,
        lineHeight: 21,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 6,
        marginTop: 6,
    },
    footerHint: {
        fontSize: 13,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.1,
        fontFamily: 'Poppins_400Regular',
        width: '100%',
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    ctaBar: {
        width: '100%',
    },
    ctaButton: {
        width: '100%',
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
