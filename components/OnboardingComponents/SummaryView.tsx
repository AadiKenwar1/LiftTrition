import { inchesToFeetInches } from '@/lib/utils/unitConversions'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export interface SummaryData {
    birthDate: Date
    gender: 'male' | 'female' | null
    unitSystem: 'imperial' | 'metric'
    height: number
    bodyWeight: number
    activityLevel: string | null
    goalType: string | null
    goalWeight: number
    goalPace: number
}

export interface SummaryViewProps {
    data: SummaryData
    onNext: () => void
    onBack: () => void
    stepIndex: number
}

const ACCENT = '#FBBF24'

const calculateAge = (birthDate: Date): number => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

const formatActivityLevel = (level: string | null) => {
    if (!level) return ''
    const map: Record<string, string> = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', gymrat: 'Gym Rat' }
    return map[level] || level
}

const formatGoalType = (type: string | null) => {
    if (!type) return ''
    return type.charAt(0).toUpperCase() + type.slice(1)
}

export default function SummaryView({ data, onNext, onBack, stepIndex }: SummaryViewProps) {
    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(251, 191, 36, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Step Indicator */}
                <View style={styles.stepIndicator}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <View key={i} style={[styles.stepDot, i === stepIndex && styles.stepDotActive]} />
                    ))}
                </View>

                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <MaterialCommunityIcons name="folder-information" size={72} color={ACCENT} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Summary</Text>
                <Text style={styles.subtitleText}>Review your details before we calculate your personalized plan</Text>

                {/* Settings Summary */}
                <View style={styles.summaryContainer}>
                    {/* Age */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Age</Text>
                        <Text style={styles.summaryValue}>{calculateAge(data.birthDate)} years old</Text>
                    </View>

                    {/* Gender */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Biological Sex</Text>
                        <Text style={styles.summaryValue}>{data.gender === 'male' ? 'Male' : 'Female'}</Text>
                    </View>

                    {/* Height */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Height</Text>
                        <Text style={styles.summaryValue}>
                            {data.unitSystem === 'imperial' ?
                                (() => {
                                    const { feet, inches } = inchesToFeetInches(data.height)
                                    return `${feet}'${inches}"`
                                })()
                            :   `${data.height} cm`}
                        </Text>
                    </View>

                    {/* Weight */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Weight</Text>
                        <Text style={styles.summaryValue}>
                            {data.bodyWeight} {data.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                        </Text>
                    </View>

                    {/* Activity Level */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Activity Level</Text>
                        <Text style={styles.summaryValue}>{formatActivityLevel(data.activityLevel)}</Text>
                    </View>

                    {/* Goal Type */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Goal</Text>
                        <Text style={styles.summaryValue}>{formatGoalType(data.goalType)} Weight</Text>
                    </View>

                    {/* Goal Weight (if not maintaining) */}
                    {data.goalType !== 'maintain' && (
                        <>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Target Weight</Text>
                                <Text style={styles.summaryValue}>
                                    {data.goalWeight} {data.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                                </Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Goal Pace</Text>
                                <Text style={styles.summaryValue}>
                                    {data.goalPace.toFixed(1)} {data.unitSystem === 'imperial' ? 'lbs' : 'kg'}/week
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Adjustable Settings Note */}
                <Text style={styles.noteText}>These settings can be adjusted at any time</Text>
            </ScrollView>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Next</Text>
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
        paddingTop: 50,
        paddingBottom: 16,
    },
    stepIndicator: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 28,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    stepDotActive: {
        width: 24,
        backgroundColor: '#FBBF24',
        borderRadius: 4,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 12,
    },
    titleText: {
        fontSize: 28,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 12,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 22,
    },
    summaryContainer: {
        width: '100%',
        backgroundColor: '#242424',
        borderRadius: 14,
        padding: 16,
        gap: 12,
        borderWidth: 2,
        borderColor: '#242424',
        marginBottom: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 15,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    summaryValue: {
        fontSize: 15,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    noteText: {
        fontSize: 12,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 24,
        fontFamily: 'Poppins_500Medium',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    backButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#242424',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#242424',
    },
    backButtonText: {
        fontSize: 16,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    nextButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#FFF1CC',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#000',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
