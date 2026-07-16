import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, useColorScheme, type Colors } from '@/context/ThemeContext'
import { feetInchesToInches, inchesToFeetInches, weightUnitLabel } from '@/lib/utils/unitConversions'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function AdjustMeasurementsScreen() {
    const { settings, setSettings, handleUpdateBw } = useSettings()
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors), [colors])
    const unitSystem = settings.unitSystem

    // Imperial: initialise from stored total inches
    const initialFtIn = inchesToFeetInches(settings.height)
    const [heightFt, setHeightFt] = useState(unitSystem === 'imperial' ? initialFtIn.feet.toString() : '')
    const [heightIn, setHeightIn] = useState(unitSystem === 'imperial' ? initialFtIn.inches.toString() : '')
    const [height, setHeight] = useState(unitSystem === 'metric' ? settings.height.toString() : '')
    const [weight, setWeight] = useState(settings.bodyWeight.toString())

    function handleSave() {
        const totalHeight = unitSystem === 'imperial' ? feetInchesToInches(Number(heightFt), Number(heightIn)) : Number(height)

        if (!validateHeightWeight(totalHeight, Number(weight), unitSystem)) return

        // Height first, then the weigh-in: handleUpdateBw's functional updater sees the
        // queued height and regenerates targets itself (respecting macrosCustomized).
        // Any goal-reached prompt is raised by handleUpdateBw and shown by the global
        // GoalPromptHost after this screen closes.
        setSettings({ ...settings, height: totalHeight })
        handleUpdateBw(Number(weight))
        router.back()
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} showsVerticalScrollIndicator={false} onScrollBeginDrag={Keyboard.dismiss}>
                    {/* Icon */}
                    <View style={styles.iconCircle}>
                        <FontAwesome5 name="pencil-ruler" size={65} color={colors.measurement} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>Update Your Measurements</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitleText}>Updates your measurements and nutrition goals</Text>

                    {/* Input Fields */}
                    <View style={styles.inputContainer}>
                        {/* Height Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Height</Text>
                            {unitSystem === 'imperial' ?
                                <View style={styles.ftInRow}>
                                    <View style={[styles.inputWrapper, styles.ftInBox]}>
                                        <TextInput style={styles.input} placeholder="5" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={heightFt} onChangeText={setHeightFt} returnKeyType="next" />
                                        <Text style={styles.unitText}>ft</Text>
                                    </View>
                                    <View style={[styles.inputWrapper, styles.ftInBox]}>
                                        <TextInput style={styles.input} placeholder="11" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={heightIn} onChangeText={setHeightIn} returnKeyType="next" />
                                        <Text style={styles.unitText}>in</Text>
                                    </View>
                                </View>
                            :   <View style={styles.inputWrapper}>
                                    <TextInput style={styles.input} placeholder="178" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={height} onChangeText={setHeight} returnKeyType="next" />
                                    <Text style={styles.unitText}>cm</Text>
                                </View>
                            }
                        </View>

                        {/* Weight Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} returnKeyType="done" onSubmitEditing={handleSave} />
                                <Text style={styles.unitText}>{weightUnitLabel(unitSystem)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={styles.nextButton} onPress={handleSave} activeOpacity={0.8}>
                        <LinearGradient colors={colors.measurementGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextButtonGradient}>
                            <Text style={[styles.nextButtonText, { color: isDark ? '#1A1B1E' : '#fff' }]}>Save</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        keyboardAvoiding: {
            flex: 1,
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
            borderColor: colors.measurement,
            marginBottom: 12,
        },
        titleText: {
            fontSize: 22,
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
        inputContainer: {
            width: '100%',
            gap: 16,
            marginBottom: 24,
        },
        inputGroup: { width: '100%' },
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
        },
        input: {
            flex: 1,
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        unitText: {
            fontSize: 14,
            color: colors.textSecondary,
            marginLeft: 12,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        ftInRow: {
            flexDirection: 'row',
            gap: 12,
        },
        ftInBox: {
            flex: 1,
        },
        nextButton: {
            width: '100%',
            height: 60,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.measurement,
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
