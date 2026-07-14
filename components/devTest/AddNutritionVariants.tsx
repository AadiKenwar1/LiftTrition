import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Lock, Sparkles, Utensils } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Dev-only layout alternatives for app/nutritionScreens/addNutritionModal.tsx.
 * Pure UI — local state + a deterministic mock "AI" so the generate flow is feelable
 * without contexts, billing, or real OpenAI calls.
 */

export type AddNutritionVariantProps = {
    hasPremium: boolean
}

type Macros = { calories: string; protein: string; carbs: string; fats: string }
const EMPTY_MACROS: Macros = { calories: '', protein: '', carbs: '', fats: '' }

function mockMacrosFor(name: string) {
    let h = 7
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973
    const protein = 18 + (h % 38)
    const carbs = 12 + (Math.floor(h / 7) % 55)
    const fats = 6 + (Math.floor(h / 49) % 24)
    return { protein, carbs, fats, calories: protein * 4 + carbs * 4 + fats * 9 }
}

export function useEntryState() {
    const [name, setName] = useState('')
    const [macros, setMacros] = useState<Macros>(EMPTY_MACROS)
    const [generating, setGenerating] = useState(false)

    const setMacro = (key: keyof Macros) => (value: string) => setMacros((prev) => ({ ...prev, [key]: value }))

    const generate = (overwrite: boolean, onDone?: () => void) => {
        if (!name.trim() || generating) return
        setGenerating(true)
        setTimeout(() => {
            const ai = mockMacrosFor(name.trim())
            setMacros((prev) => ({
                calories: overwrite || !prev.calories.trim() ? String(ai.calories) : prev.calories,
                protein: overwrite || !prev.protein.trim() ? String(ai.protein) : prev.protein,
                carbs: overwrite || !prev.carbs.trim() ? String(ai.carbs) : prev.carbs,
                fats: overwrite || !prev.fats.trim() ? String(ai.fats) : prev.fats,
            }))
            setGenerating(false)
            onDone?.()
        }, 900)
    }

    return { name, setName, macros, setMacro, generating, generate }
}

export function SheetHandle() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.handleContainer}>
            <View style={styles.handle} />
        </View>
    )
}

export function FooterCTA({ label, disabled }: { label: string; disabled?: boolean }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    return (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity activeOpacity={0.8} disabled={disabled} onPress={Keyboard.dismiss} style={[styles.ctaTouchable, disabled && styles.ctaDisabled]}>
                <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                    <Text style={styles.ctaText}>{label}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    )
}

/**
 * 1 · Lean form — the current layout with the ceremony removed. Small icon chip +
 * left-aligned title instead of the 100px hero circle, name field first, compact AI
 * pill, calories as a hero row + Protein/Carbs/Fats cells (matches the Entry /
 * DailyIntakeCard display idiom and RESTYLE_PLAN macro order), pinned footer CTA.
 */
export function VariantLeanForm({ hasPremium }: AddNutritionVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const entry = useEntryState()
    const [focused, setFocused] = useState<string | null>(null)

    return (
        <View style={styles.sheet}>
            <SheetHandle />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <View style={styles.headerChip}>
                        <Utensils size={17} color={colors.nutrition} strokeWidth={2.4} />
                    </View>
                    <Text style={styles.headerTitle}>Add meal</Text>
                </View>

                <Text style={styles.fieldLabel}>Meal</Text>
                <TextInput
                    style={[styles.nameInput, focused === 'name' && styles.inputFocused]}
                    placeholder="e.g. Grilled chicken salad"
                    placeholderTextColor={colors.placeholder}
                    value={entry.name}
                    onChangeText={entry.setName}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    multiline
                    textAlignVertical="top"
                />

                <TouchableOpacity style={[styles.aiPill, !hasPremium && styles.aiPillLocked]} activeOpacity={0.8} disabled={entry.generating} onPress={() => hasPremium && entry.generate(false)}>
                    {entry.generating ?
                        <ActivityIndicator size="small" color={colors.nutrition} />
                    :   <>
                            {hasPremium ?
                                <Sparkles size={14} color={colors.nutritionInk} strokeWidth={2.2} />
                            :   <Lock size={13} color={colors.textMuted} strokeWidth={2.2} />}
                            <Text style={[styles.aiPillText, !hasPremium && styles.aiPillTextLocked]}>{hasPremium ? 'Generate macros' : 'Generate macros · Premium'}</Text>
                        </>
                    }
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Macros</Text>
                <View style={[styles.calorieCell, focused === 'calories' && styles.inputFocused]}>
                    <View>
                        <Text style={styles.calorieLabel}>Calories</Text>
                        <Text style={styles.cellUnit}>kcal</Text>
                    </View>
                    <TextInput
                        style={styles.calorieInput}
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                        value={entry.macros.calories}
                        onChangeText={entry.setMacro('calories')}
                        onFocus={() => setFocused('calories')}
                        onBlur={() => setFocused(null)}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.macroCellRow}>
                    {([
                        ['protein', 'Protein'],
                        ['carbs', 'Carbs'],
                        ['fats', 'Fats'],
                    ] as const).map(([key, label]) => (
                        <View key={key} style={[styles.macroCell, focused === key && styles.inputFocused]}>
                            <Text style={styles.cellLabel}>{label}</Text>
                            <TextInput
                                style={styles.macroCellInput}
                                placeholder="0"
                                placeholderTextColor={colors.placeholder}
                                value={entry.macros[key]}
                                onChangeText={entry.setMacro(key)}
                                onFocus={() => setFocused(key)}
                                onBlur={() => setFocused(null)}
                                keyboardType="numeric"
                            />
                            <Text style={styles.cellUnit}>g</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
            <FooterCTA label="Add meal" />
        </View>
    )
}

/**
 * 2 · Macro grid — 2×2 tiles with big centered numerals, the AI affordance folded
 * into the name field as an inline sparkle button, and a live arithmetic check
 * (protein·4 + carbs·4 + fats·9) that flags a calorie mismatch before saving.
 */
export function VariantMacroGrid({ hasPremium }: AddNutritionVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const entry = useEntryState()
    const [focused, setFocused] = useState<string | null>(null)

    const p = parseFloat(entry.macros.protein) || 0
    const c = parseFloat(entry.macros.carbs) || 0
    const f = parseFloat(entry.macros.fats) || 0
    const macroKcal = Math.round(p * 4 + c * 4 + f * 9)
    const enteredKcal = parseFloat(entry.macros.calories) || 0
    const hasMacros = macroKcal > 0
    const mismatch = hasMacros && enteredKcal > 0 && Math.abs(enteredKcal - macroKcal) / macroKcal > 0.15

    const tiles = ([
        ['calories', 'Calories', 'kcal'],
        ['protein', 'Protein', 'g'],
        ['carbs', 'Carbs', 'g'],
        ['fats', 'Fats', 'g'],
    ] as const).map(([key, label, unit]) => (
        <View key={key} style={[styles.tile, focused === key && styles.inputFocused]}>
            <Text style={styles.cellLabel}>
                {label} <Text style={styles.tileUnit}>· {unit}</Text>
            </Text>
            <TextInput
                style={styles.tileInput}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                value={entry.macros[key]}
                onChangeText={entry.setMacro(key)}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
                keyboardType="numeric"
            />
        </View>
    ))

    return (
        <View style={styles.sheet}>
            <SheetHandle />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.headerTitle}>Add meal</Text>

                <Text style={styles.fieldLabel}>Meal</Text>
                <View style={[styles.inlineInputRow, focused === 'name' && styles.inputFocused]}>
                    <TextInput
                        style={styles.inlineInput}
                        placeholder="e.g. Grilled chicken salad"
                        placeholderTextColor={colors.placeholder}
                        value={entry.name}
                        onChangeText={entry.setName}
                        onFocus={() => setFocused('name')}
                        onBlur={() => setFocused(null)}
                    />
                    <TouchableOpacity style={[styles.inlineAiButton, !hasPremium && styles.inlineAiButtonLocked]} activeOpacity={0.8} disabled={entry.generating} onPress={() => hasPremium && entry.generate(false)}>
                        {entry.generating ?
                            <ActivityIndicator size="small" color={colors.nutrition} />
                        : hasPremium ?
                            <Sparkles size={16} color={colors.nutrition} strokeWidth={2.2} />
                        :   <Lock size={14} color={colors.textMuted} strokeWidth={2.2} />}
                    </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Macros</Text>
                <View style={styles.tileRow}>
                    {tiles[0]}
                    {tiles[1]}
                </View>
                <View style={styles.tileRow}>
                    {tiles[2]}
                    {tiles[3]}
                </View>

                {hasMacros && (
                    <Text style={[styles.kcalCheck, mismatch && styles.kcalCheckWarning]}>
                        {mismatch ? `Macros add up to ~${macroKcal} kcal — calories is set to ${Math.round(enteredKcal)}` : `≈ ${macroKcal} kcal from macros`}
                    </Text>
                )}
            </ScrollView>
            <FooterCTA label="Add meal" />
        </View>
    )
}

/**
 * 3 · AI-first — the describe field is the hero ("What did you eat?"), generate is
 * the primary gradient action, and manual entry is demoted below a divider as a
 * compact editable review row. Add stays disabled until there is something to save.
 */
export function VariantAiFirst({ hasPremium }: AddNutritionVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const entry = useEntryState()
    const [focused, setFocused] = useState<string | null>(null)
    const [aiFilled, setAiFilled] = useState(false)

    const hasContent = entry.name.trim().length > 0 || Object.values(entry.macros).some((v) => v.trim().length > 0)

    return (
        <View style={styles.sheet}>
            <SheetHandle />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.heroTitle}>What did you eat?</Text>
                <Text style={styles.heroSub}>Describe it — AI fills in the macros</Text>

                <TextInput
                    style={[styles.heroInput, focused === 'name' && styles.inputFocused]}
                    placeholder="e.g. Two eggs on toast with butter, a black coffee"
                    placeholderTextColor={colors.placeholder}
                    value={entry.name}
                    onChangeText={entry.setName}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    multiline
                    textAlignVertical="top"
                />

                {hasPremium ?
                    <TouchableOpacity activeOpacity={0.8} disabled={entry.generating} style={styles.generatePrimaryTouchable} onPress={() => entry.generate(true, () => setAiFilled(true))}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generatePrimary}>
                            {entry.generating ?
                                <ActivityIndicator size="small" color="#FFF" />
                            :   <>
                                    <Sparkles size={17} color="#FFF" strokeWidth={2.2} />
                                    <Text style={styles.generatePrimaryText}>Generate macros</Text>
                                </>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                :   <TouchableOpacity activeOpacity={0.8} style={styles.generateLocked}>
                        <Lock size={15} color={colors.textMuted} strokeWidth={2.2} />
                        <Text style={styles.generateLockedText}>Generate macros — Premium</Text>
                    </TouchableOpacity>
                }

                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or enter manually</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.miniCellRow}>
                    {([
                        ['calories', 'Calories'],
                        ['protein', 'Protein'],
                        ['carbs', 'Carbs'],
                        ['fats', 'Fats'],
                    ] as const).map(([key, label]) => (
                        <View key={key} style={[styles.miniCell, focused === key && styles.inputFocused]}>
                            <Text style={styles.miniCellLabel}>{label}</Text>
                            <TextInput
                                style={styles.miniCellInput}
                                placeholder="0"
                                placeholderTextColor={colors.placeholder}
                                value={entry.macros[key]}
                                onChangeText={entry.setMacro(key)}
                                onFocus={() => setFocused(key)}
                                onBlur={() => setFocused(null)}
                                keyboardType="numeric"
                            />
                        </View>
                    ))}
                </View>

                {aiFilled && <Text style={styles.aiEstimateNote}>AI estimate — tap any value to adjust</Text>}
            </ScrollView>
            <FooterCTA label="Add meal" disabled={!hasContent} />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        sheet: {
            flex: 1,
            backgroundColor: colors.background,
        },
        handleContainer: {
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
        },
        handle: {
            width: 40,
            height: 5,
            backgroundColor: colors.border,
            borderRadius: 3,
        },
        scrollContent: {
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 24,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 18,
        },
        headerChip: {
            width: 34,
            height: 34,
            borderRadius: radius.iconTile,
            backgroundColor: colors.nutrition + '1A',
            borderWidth: 1,
            borderColor: colors.nutrition + '55',
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: 20,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            marginBottom: 0,
        },
        fieldLabel: {
            fontSize: 13,
            color: colors.labelMuted,
            fontFamily: fonts.semibold,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            marginTop: 16,
            marginBottom: 8,
        },
        nameInput: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            lineHeight: 20,
            minHeight: 62,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        inputFocused: {
            borderColor: colors.nutrition,
        },
        aiPill: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            minHeight: 34,
            paddingVertical: 7,
            paddingHorizontal: 14,
            marginTop: 10,
            backgroundColor: colors.nutrition + '14',
            borderRadius: radius.chip,
            borderWidth: 1,
            borderColor: colors.nutrition + '55',
        },
        aiPillLocked: {
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
        },
        aiPillText: {
            fontSize: 13,
            color: colors.nutritionInk,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        aiPillTextLocked: {
            color: colors.textMuted,
        },
        calorieCell: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 10,
        },
        calorieLabel: {
            fontSize: 15,
            color: colors.text,
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
        calorieInput: {
            flex: 1,
            fontSize: 24,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'right',
            paddingVertical: 4,
            paddingLeft: 12,
        },
        macroCellRow: {
            flexDirection: 'row',
            gap: 10,
        },
        macroCell: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingVertical: 10,
        },
        macroCellInput: {
            alignSelf: 'stretch',
            fontSize: 20,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'center',
            paddingVertical: 2,
        },
        cellLabel: {
            fontSize: 12,
            color: colors.labelMuted,
            fontFamily: fonts.medium,
        },
        cellUnit: {
            fontSize: 11,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        inlineInputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingLeft: 14,
            paddingRight: 6,
            paddingVertical: 5,
        },
        inlineInput: {
            flex: 1,
            fontSize: 15,
            color: colors.text,
            fontFamily: fonts.regular,
            paddingVertical: 8,
        },
        inlineAiButton: {
            width: 36,
            height: 36,
            borderRadius: radius.iconButton,
            backgroundColor: colors.nutrition + '1A',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
        },
        inlineAiButtonLocked: {
            backgroundColor: colors.surfaceInset,
        },
        tileRow: {
            flexDirection: 'row',
            gap: 10,
            marginBottom: 10,
        },
        tile: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingVertical: 12,
            paddingHorizontal: 14,
        },
        tileUnit: {
            color: colors.textMuted,
        },
        tileInput: {
            fontSize: 24,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'center',
            paddingVertical: 6,
        },
        kcalCheck: {
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.medium,
            marginTop: 2,
        },
        kcalCheckWarning: {
            color: colors.warning,
        },
        heroTitle: {
            fontSize: 24,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            marginTop: 8,
            marginBottom: 4,
        },
        heroSub: {
            fontSize: 14,
            color: colors.labelMuted,
            fontFamily: fonts.regular,
            letterSpacing: 0.1,
            marginBottom: 16,
        },
        heroInput: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            lineHeight: 22,
            minHeight: 110,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
            marginBottom: 12,
        },
        generatePrimaryTouchable: {
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        generatePrimary: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: radius.cardLg,
            minHeight: 50,
            paddingHorizontal: 20,
        },
        generatePrimaryText: {
            fontSize: 16,
            color: '#FFF',
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
        generateLocked: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: radius.cardLg,
            minHeight: 50,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.hairline,
        },
        generateLockedText: {
            fontSize: 15,
            color: colors.textMuted,
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
        dividerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginVertical: 18,
        },
        dividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: colors.divider,
        },
        dividerText: {
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        miniCellRow: {
            flexDirection: 'row',
            gap: 8,
        },
        miniCell: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingVertical: 9,
        },
        miniCellLabel: {
            fontSize: 11,
            color: colors.labelMuted,
            fontFamily: fonts.medium,
        },
        miniCellInput: {
            alignSelf: 'stretch',
            fontSize: 16,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'center',
            paddingVertical: 2,
        },
        aiEstimateNote: {
            fontSize: 12,
            color: colors.nutritionInk,
            fontFamily: fonts.medium,
            marginTop: 10,
        },
        footer: {
            paddingHorizontal: 20,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            backgroundColor: colors.background,
        },
        ctaTouchable: {
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
        },
        ctaDisabled: {
            opacity: 0.4,
        },
        cta: {
            borderRadius: radius.cardLg,
            paddingVertical: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            fontSize: 16,
            color: '#FFF',
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
    })
}
