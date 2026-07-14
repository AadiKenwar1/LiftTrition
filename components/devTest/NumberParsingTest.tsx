import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { parseNumericInput, sanitizeInt, sanitizeMacro } from '@/lib/utils/number'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Test harness for lib/utils/number.ts (F1) — the single grammar for user-typed numbers.
 * Presets inject strings a US-locale simulator keyboard can't produce (comma decimals,
 * multi-dot garbage) so the comma-locale bug class (AUDIT issue 10) is reviewable anywhere.
 */

const PRESETS = [
    { label: '80,5 (comma)', value: '80,5' },
    { label: '12..5', value: '12..5' },
    { label: '.', value: '.' },
    { label: 'empty', value: '' },
    { label: '␣80.5␣', value: ' 80.5 ' },
    { label: '1,2,3', value: '1,2,3' },
    { label: '-12.5', value: '-12.5' },
    { label: 'Infinity', value: 'Infinity' },
]

function show(n: number | null): string {
    if (n === null) return 'null'
    if (Number.isNaN(n)) return 'NaN'
    return String(n)
}

export default function NumberParsingTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    const [text, setText] = useState('80,5')
    const [lastSubmit, setLastSubmit] = useState('—')

    const parsed = parseNumericInput(text)
    const legacyNumber = Number(text)
    const legacyParseFloat = parseFloat(text)
    const ctaEnabled = parsed !== null

    const submit = () => {
        if (parsed === null) return
        if (!validateHeightWeight(70, parsed, 'imperial')) {
            setLastSubmit(`${show(parsed)} → rejected by validateHeightWeight (alert shown)`)
            return
        }
        setLastSubmit(`saved ${show(parsed)}`)
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.row} onPress={() => setColorScheme(isDark ? 'light' : 'dark')} activeOpacity={0.6}>
                <Text style={styles.rowLabel}>Theme</Text>
                <Text style={styles.rowValue}>{isDark ? 'Dark' : 'Light'}</Text>
            </TouchableOpacity>

            <Field label="Presets (strings a US keyboard can't type)">
                <Segmented options={PRESETS} value={text} onChange={setText} />
            </Field>

            <Field label="Input (decimal-pad, same as the real modals)">
                <TextInput style={styles.input} value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="Type a number" placeholderTextColor={colors.placeholder} />
            </Field>

            <Text style={styles.sectionTitle}>Old grammars vs F1</Text>
            <View style={styles.card}>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Number(text) — old updateBW/logs</Text>
                    <Text style={[styles.resultValue, !Number.isFinite(legacyNumber) && styles.bad]}>{show(legacyNumber)}</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>parseFloat(text) — old nutrition</Text>
                    <Text style={[styles.resultValue, (!Number.isFinite(legacyParseFloat) || legacyParseFloat !== parsed) && styles.bad]}>{show(legacyParseFloat)}</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>parseNumericInput(text)</Text>
                    <Text style={[styles.resultValue, parsed === null ? styles.warn : styles.good]}>{show(parsed)}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Boundary sanitizers (issue 3)</Text>
            <View style={styles.card}>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>sanitizeInt(parsed ?? NaN)</Text>
                    <Text style={styles.resultValue}>{show(sanitizeInt(parsed ?? NaN))}</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>sanitizeMacro(parsed ?? NaN)</Text>
                    <Text style={styles.resultValue}>{show(sanitizeMacro(parsed ?? NaN))}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Submit contract (mirrors updateBWModal)</Text>
            <View style={styles.card}>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>CTA state</Text>
                    <Text style={[styles.resultValue, ctaEnabled ? styles.good : styles.warn]}>{ctaEnabled ? 'enabled' : 'disabled (parse = null)'}</Text>
                </View>
                <TouchableOpacity style={[styles.submitButton, !ctaEnabled && styles.submitDisabled]} disabled={!ctaEnabled} onPress={submit} activeOpacity={0.8}>
                    <Text style={styles.submitText}>Update weight (validates ≥ 50 lbs)</Text>
                </TouchableOpacity>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Last submit</Text>
                    <Text style={styles.resultValue}>{lastSubmit}</Text>
                </View>
            </View>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
            paddingBottom: 60,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 16,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        rowLabel: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
        },
        rowValue: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.textSecondary,
        },
        input: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.text,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        sectionTitle: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 16,
            marginBottom: 8,
            marginLeft: 2,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 16,
            paddingVertical: 6,
        },
        resultRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 10,
        },
        resultLabel: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textSecondary,
            flexShrink: 1,
            marginRight: 12,
        },
        resultValue: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.text,
        },
        good: {
            color: colors.workout,
        },
        warn: {
            color: colors.textMuted,
        },
        bad: {
            color: colors.destructive,
        },
        submitButton: {
            backgroundColor: colors.nutrition,
            borderRadius: radius.card,
            paddingVertical: 12,
            alignItems: 'center',
            marginVertical: 8,
        },
        submitDisabled: {
            opacity: 0.4,
        },
        submitText: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: '#FFF',
        },
    })
}
