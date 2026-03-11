import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useRouter } from 'expo-router'
import { Check, ChevronRight } from 'lucide-react-native'
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const { width: screenWidth } = Dimensions.get('window')

export default function Onboarding1Screen() {
    const { settings, setSettings } = useSettings()
    const { signOut } = useAuth()
    const router = useRouter()

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.welcomeText}>Welcome to</Text>
                    <Text style={styles.titleText}>LiftTrition</Text>
                    <View style={styles.accentLine} />
                </View>

                {/* Subtitle */}
                <Text style={styles.subtitleText}>LiftTrition is a free to use fitness app that helps you...</Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                    <View style={styles.featureItem}>
                        <View style={styles.checkCircle}>
                            <Check size={18} color="#2f80ed" strokeWidth={3} />
                        </View>
                        <Text style={styles.featureText}>Simplify workout and nutrition tracking</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.checkCircle}>
                            <Check size={18} color="#2f80ed" strokeWidth={3} />
                        </View>
                        <Text style={styles.featureText}>Gain insights through understandable visualizations</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.checkCircle}>
                            <Check size={18} color="#2f80ed" strokeWidth={3} />
                        </View>
                        <Text style={styles.featureText}>Build muscle and strength</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.checkCircle}>
                            <Check size={18} color="#2f80ed" strokeWidth={3} />
                        </View>
                        <Text style={styles.featureText}>Achieve your ideal body weight and stay healthy</Text>
                    </View>
                </View>

                {/* Bottom Text */}
                <Text style={styles.bottomText}>Before we begin, we're going to need some information about you to calibrate your fitness goals.</Text>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                    router.push('/onboardingScreens/onboarding2')
                }}
                activeOpacity={0.8}
            >
                <Text style={styles.ctaText}>Get Started</Text>
                <ChevronRight size={24} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 60,
        paddingBottom: 50,
    },
    content: {
        alignItems: 'center',
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    welcomeText: {
        fontSize: 18,
        color: '#888',
        letterSpacing: 0.2,
        marginBottom: 4,
        fontFamily: 'Poppins_500Medium',
    },
    titleText: {
        fontSize: 42,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    accentLine: {
        width: 60,
        height: 4,
        backgroundColor: '#2f80ed',
        borderRadius: 2,
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 24,
        letterSpacing: 0.2,
        marginBottom: 30,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    featuresContainer: {
        gap: 24,
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        paddingHorizontal: 8,
    },
    checkCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(45, 156, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(45, 156, 255, 0.3)',
    },
    featureText: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        lineHeight: 24,
        fontFamily: 'Poppins_500Medium',
    },
    bottomText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        marginTop: 36,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    ctaButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#2f80ed',
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    ctaText: {
        fontSize: 18,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    testResetButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 10,
    },
    testResetText: {
        fontSize: 12,
        color: '#888',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
})
