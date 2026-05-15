import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { feetInchesToInches, inchesToFeetInches } from '@/lib/utils/unitConversions'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { router } from 'expo-router'
import { useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function AdjustMeasurementsScreen() {
    const { settings, setSettings, handleUpdateBw, calculateMacros } = useSettings()
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(settings.unitSystem)

    // Imperial: initialise from stored total inches
    const initialFtIn = inchesToFeetInches(settings.height)
    const [heightFt, setHeightFt] = useState(settings.unitSystem === 'imperial' ? initialFtIn.feet.toString() : '')
    const [heightIn, setHeightIn] = useState(settings.unitSystem === 'imperial' ? initialFtIn.inches.toString() : '')
    const [height, setHeight] = useState(settings.unitSystem === 'metric' ? settings.height.toString() : '')
    const [weight, setWeight] = useState(settings.bodyWeight.toString())

    function handleSave() {
        const totalHeight = unitSystem === 'imperial' ? feetInchesToInches(Number(heightFt), Number(heightIn)) : Number(height)

        if (!validateHeightWeight(totalHeight, Number(weight), unitSystem)) return

        const updatedSettings = {
            ...settings,
            height: totalHeight,
            bodyWeight: Number(weight),
            unitSystem,
        }
        const macros = calculateMacros(updatedSettings, unitSystem === 'imperial')

        setSettings({
            ...updatedSettings,
            calorieGoal: macros.calResult,
            proteinGoal: macros.proteinGrams,
            carbsGoal: macros.carbGrams,
            fatsGoal: macros.fatGrams,
        })
        handleUpdateBw(Number(weight)) // Updates bwProgress; it also calls setSettings - see note below
        router.back()
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={Keyboard.dismiss}
                >
                    {/* Icon */}
                    <View style={[styles.iconCircle, { borderColor: '#FBBF24' }]}>
                        <FontAwesome5 name="pencil-ruler" size={65} color={'#FBBF24'} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>Update Your Measurements</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitleText}>Updates Nutrition Goals and Unit System</Text>

                    {/* Unit System Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity style={[styles.toggleButton, unitSystem === 'imperial' && { borderColor: '#FBBF24' }]} onPress={() => setUnitSystem('imperial')} activeOpacity={0.5}>
                            <Text style={[styles.toggleText, unitSystem === 'imperial' && styles.toggleTextActive]}>Imperial</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleButton, unitSystem === 'metric' && { borderColor: '#FBBF24' }]} onPress={() => setUnitSystem('metric')} activeOpacity={0.5}>
                            <Text style={[styles.toggleText, unitSystem === 'metric' && styles.toggleTextActive]}>Metric</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input Fields */}
                    <View style={styles.inputContainer}>
                        {/* Height Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Height</Text>
                            {unitSystem === 'imperial' ?
                                <View style={styles.ftInRow}>
                                    <View style={[styles.inputWrapper, styles.ftInBox]}>
                                        <TextInput style={styles.input} placeholder="5" placeholderTextColor="#555" keyboardType="numeric" value={heightFt} onChangeText={setHeightFt} returnKeyType="next" />
                                        <Text style={styles.unitText}>ft</Text>
                                    </View>
                                    <View style={[styles.inputWrapper, styles.ftInBox]}>
                                        <TextInput style={styles.input} placeholder="11" placeholderTextColor="#555" keyboardType="numeric" value={heightIn} onChangeText={setHeightIn} returnKeyType="next" />
                                        <Text style={styles.unitText}>in</Text>
                                    </View>
                                </View>
                            :   <View style={styles.inputWrapper}>
                                    <TextInput style={styles.input} placeholder="178" placeholderTextColor="#555" keyboardType="numeric" value={height} onChangeText={setHeight} returnKeyType="next" />
                                    <Text style={styles.unitText}>cm</Text>
                                </View>
                            }
                        </View>

                        {/* Weight Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={unitSystem === 'imperial' ? '160' : '73'}
                                    placeholderTextColor="#555"
                                    keyboardType="numeric"
                                    value={weight}
                                    onChangeText={setWeight}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSave}
                                />
                                <Text style={styles.unitText}>{unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={styles.nextButton} onPress={handleSave} activeOpacity={0.8}>
                        <Text style={styles.nextButtonText}>Save</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
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
        paddingHorizontal: 25,
        paddingTop: 20,
        paddingBottom: 40,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        marginBottom: 12,
    },
    titleText: {
        fontSize: 22,
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
        marginBottom: 24,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    toggleContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#242424',
    },
    toggleText: {
        fontSize: 16,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    toggleTextActive: { color: '#fff' },
    inputContainer: {
        width: '100%',
        gap: 16,
        marginBottom: 32,
    },
    inputGroup: { width: '100%' },
    inputLabel: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 8,
        paddingLeft: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#242424',
        paddingHorizontal: 16,
        height: 60,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    unitText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    ftInRow: {
        flexDirection: 'row',
        gap: 12,
    },
    ftInBox: {
        flex: 1,
    },
    nextButton: {
        backgroundColor: '#FBBF24',
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
