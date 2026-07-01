import Slider from '@react-native-community/slider'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Gauge, Rabbit, Turtle } from 'lucide-react-native'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Dev-only Version 1 preview of the Pace onboarding screen (app/onboardingScreens/onboarding7.tsx).
 * Self-contained: local slider state, Back returns to the versions list, Next is inert.
 */
const ACCENT = '#22C922'

const getPaceLabel = (value: number) => {
    if (value < 0.5) return 'Very Slow'
    if (value < 1.0) return 'Slow'
    if (value < 1.5) return 'Moderate'
    if (value < 2.0) return 'Fast'
    if (value < 2.5) return 'Very Fast'
    return 'Extreme'
}

export default function PaceV1() {
    const router = useRouter()
    const [goalPace, setGoalPace] = useState(1.0)

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(34, 201, 34, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.stepIndicator}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <View key={i} style={[styles.stepDot, i === 5 && styles.stepDotActive]} />
                    ))}
                </View>

                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <Gauge size={72} color={ACCENT} strokeWidth={2} />
                </View>

                <Text style={styles.titleText}>How Fast Do You Want to Reach Your Body Weight Goal?</Text>
                <Text style={styles.subtitleText}>We use your goal pace to adjust your nutrition goals. {'\n'}(Pounds per week).</Text>

                <View style={styles.sliderContainer}>
                    <View style={styles.valueDisplay}>
                        <Text style={styles.valueText}>{goalPace.toFixed(1)}</Text>
                        <Text style={styles.valueLabelText}>{getPaceLabel(goalPace)}</Text>
                    </View>

                    <View style={styles.sliderRow}>
                        <Turtle size={24} color="#666" strokeWidth={2} />
                        <Slider style={styles.slider} minimumValue={0.2} maximumValue={3.0} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor={ACCENT} maximumTrackTintColor="#333" thumbTintColor={ACCENT} />
                        <Rabbit size={24} color="#666" strokeWidth={2} />
                    </View>

                    <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabelText}>0.2</Text>
                        <Text style={styles.rangeLabelText}>3.0</Text>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', paddingHorizontal: 25, paddingBottom: 50 },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
    scroll: { flex: 1 },
    scrollContent: { alignItems: 'center', width: '100%', paddingTop: 50, paddingBottom: 16 },
    stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
    stepDotActive: { width: 24, backgroundColor: '#22C922', borderRadius: 4 },
    iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
    titleText: { fontSize: 24, color: '#fff', letterSpacing: -0.5, marginBottom: 4, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
    subtitleText: { fontSize: 16, color: '#aaa', textAlign: 'center', letterSpacing: 0.2, marginBottom: 24, paddingHorizontal: 8, fontFamily: 'Poppins_400Regular', lineHeight: 22 },
    sliderContainer: { width: '100%', paddingHorizontal: 12, marginBottom: 24 },
    valueDisplay: { alignItems: 'center', marginBottom: 24 },
    valueText: { color: '#fff', fontSize: 48, marginBottom: 6, letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    valueLabelText: { fontSize: 24, color: '#aaa', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    sliderRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
    slider: { flex: 1, height: 40 },
    rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
    rangeLabelText: { fontSize: 14, color: '#666', letterSpacing: 0.2, fontFamily: 'Poppins_500Medium' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
    backButton: { flex: 1, height: 60, backgroundColor: '#1e1e1e', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#242424' },
    backButtonText: { fontSize: 17, color: '#aaa', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    nextButton: { flex: 1, height: 60, backgroundColor: '#D4F5D4', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    nextButtonText: { fontSize: 16, color: '#000', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
})
