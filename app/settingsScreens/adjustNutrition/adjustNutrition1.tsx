import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight, validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Target } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function AdjustNutrition2Screen() {
    const { settings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain' | null>(settings.goalType)
    const [targetWeight, setTargetWeight] = useState(settings.goalWeight.toString())

    function handleNext() {
        if (!validateHeightWeight(Number(settings.height), Number(settings.bodyWeight), settings.unitSystem as 'imperial' | 'metric')) return
        if (!validateTargetWeight(Number(targetWeight), Number(settings.bodyWeight), goal, settings.unitSystem as 'imperial' | 'metric')) return
        const commonParams = {
            height: settings.height.toString(),
            weight: settings.bodyWeight.toString(),
            unitSystem: settings.unitSystem,
            goal: goal as string,
            targetWeight: goal === 'maintain' ? settings.bodyWeight.toString() : targetWeight,
        }
        if (goal === 'maintain') {
            router.push({
                pathname: '/settingsScreens/adjustNutrition/adjustNutrition3',
                params: { ...commonParams, goalPace: '0' },
            })
        } else {
            router.push({ pathname: '/settingsScreens/adjustNutrition/adjustNutrition2', params: commonParams })
        }
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScrollBeginDrag={Keyboard.dismiss}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Target size={96} color={colors.nutrition} strokeWidth={2} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>What's Your {'\n'}Bodyweight Goal?</Text>

                {/* Subtitle */}
                <Text style={styles.subtitleText}>Needed for nutrition calculation adjustments</Text>

                {/* Goal Options */}
                <View style={styles.goalContainer}>
                    <TouchableOpacity style={[styles.goalButton, goal === 'lose' && styles.goalButtonSelected]} onPress={() => setGoal('lose')} activeOpacity={0.5}>
                        <Text style={[styles.goalText, goal === 'lose' && styles.goalTextSelected]}>Lose</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.goalButton, goal === 'maintain' && styles.goalButtonSelected]} onPress={() => setGoal('maintain')} activeOpacity={0.5}>
                        <Text style={[styles.goalText, goal === 'maintain' && styles.goalTextSelected]}>Maintain</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.goalButton, goal === 'gain' && styles.goalButtonSelected]} onPress={() => setGoal('gain')} activeOpacity={0.5}>
                        <Text style={[styles.goalText, goal === 'gain' && styles.goalTextSelected]}>Gain</Text>
                    </TouchableOpacity>
                </View>

                {/* Target Weight Input or Maintain Message */}
                {goal && goal !== 'maintain' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Target Weight</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder="150" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} />
                            <Text style={styles.unitText}>{settings.unitSystem === 'metric' ? 'kg' : 'lbs'}</Text>
                        </View>
                    </View>
                )}

                {goal === 'maintain' && (
                    <View style={[styles.maintainMessageContainer]}>
                        <Text style={styles.maintainMessageText}>Maintaining body weight, so no target weight needed</Text>
                    </View>
                )}

                {/* Next Button */}
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextButtonGradient}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scroll: {
            flex: 1,
            width: '100%',
        },
        scrollContent: {
            flexGrow: 1,
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 40,
        },
        iconCircle: {
            width: 144,
            height: 144,
            borderRadius: 72,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
            marginBottom: 12,
        },
        titleText: {
            fontSize: 28,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 4,
            textAlign: 'center',
            fontFamily: fonts.semibold,
        },
        subtitleText: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            letterSpacing: 0.2,
            marginBottom: 24,
            paddingHorizontal: 8,
            fontFamily: fonts.regular,
        },
        goalContainer: {
            flexDirection: 'row',
            width: '100%',
            gap: 10,
            marginBottom: 24,
        },
        goalButton: {
            flex: 1,
            height: 60,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 2,
            borderColor: colors.border,
        },
        goalButtonSelected: {
            borderColor: colors.nutrition,
        },
        goalText: {
            fontSize: 16,
            color: colors.textSecondary,
            letterSpacing: -0.5,
            fontFamily: fonts.medium,
        },
        goalTextSelected: { color: colors.text },
        inputGroup: {
            width: '100%',
            marginBottom: 24,
        },
        inputLabel: {
            fontSize: 16,
            color: colors.textSecondary,
            marginBottom: 8,
            paddingLeft: 4,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 16,
            height: 60,
            marginBottom: 8,
        },
        input: {
            flex: 1,
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        unitText: {
            fontSize: 16,
            color: colors.textSecondary,
            marginLeft: 12,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        maintainMessageContainer: {
            width: '100%',
            paddingVertical: 20,
            paddingHorizontal: 20,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            marginBottom: 24,
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
        },
        maintainMessageText: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            letterSpacing: 0.2,
            fontFamily: fonts.medium,
        },
        nextButton: {
            width: '100%',
            height: 60,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
        },
        nextButtonGradient: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        },
        nextButtonText: {
            fontSize: 16,
            color: '#fff',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
