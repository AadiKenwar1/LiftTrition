import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronDown, ChevronUp, Lock, Sparkles } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, LayoutAnimation, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { FooterCTA, SheetHandle, useEntryState, type AddNutritionVariantProps } from './AddNutritionVariants'

/**
 * Dev-only variations on the base AI-first layout (VariantAiFirst) that keep the
 * hero + Generate skeleton identical and only restyle the manual-entry section:
 * ledger card, inset panel, or collapsible row.
 */

const FIELDS = [
    ['calories', 'Calories', 'kcal'],
    ['protein', 'Protein', 'g'],
    ['carbs', 'Carbs', 'g'],
    ['fats', 'Fats', 'g'],
] as const

function animate() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
}

function DescribeHero({ entry, focused, setFocused, hasPremium, onGenerated }: { entry: ReturnType<typeof useEntryState>; focused: string | null; setFocused: (v: string | null) => void; hasPremium: boolean; onGenerated: () => void }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <>
            <Text style={styles.heroTitle}>Enter Nutrition</Text>
            <Text style={styles.heroSub}>Describe your meal — AI fills in the macros</Text>

            <TextInput style={[styles.heroInput, focused === 'name' && styles.inputFocused]} placeholder="e.g. Two eggs on toast with butter, a black coffee" placeholderTextColor={colors.placeholder} value={entry.name} onChangeText={entry.setName} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} multiline textAlignVertical="top" />

            {hasPremium ?
                <TouchableOpacity activeOpacity={0.8} disabled={entry.generating} style={styles.generatePrimaryTouchable} onPress={() => entry.generate(true, onGenerated)}>
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
        </>
    )
}

function ManualDivider() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or enter manually</Text>
            <View style={styles.dividerLine} />
        </View>
    )
}

/**
 * 4a · Ledger card — manual entry as a receipt: one card, one row per macro with a
 * hairline between rows, right-aligned bold numbers and a fixed unit column so the
 * numerals line up. The focused row tints instead of re-bordering.
 */
export function VariantAiLedger({ hasPremium }: AddNutritionVariantProps) {
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
                <DescribeHero entry={entry} focused={focused} setFocused={setFocused} hasPremium={hasPremium} onGenerated={() => setAiFilled(true)} />
                <ManualDivider />

                <View style={styles.ledgerCard}>
                    {FIELDS.map(([key, label, unit], i) => (
                        <View key={key} style={[styles.ledgerRow, i < FIELDS.length - 1 && styles.ledgerRowBorder, focused === key && styles.ledgerRowFocused]}>
                            <Text style={styles.ledgerLabel}>{label}</Text>
                            <TextInput style={styles.ledgerInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros[key]} onChangeText={entry.setMacro(key)} onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} keyboardType="numeric" />
                            <Text style={styles.ledgerUnit}>{unit}</Text>
                        </View>
                    ))}
                </View>

                {aiFilled && <Text style={styles.aiEstimateNote}>AI estimate — tap any value to adjust</Text>}
            </ScrollView>
            <FooterCTA label="Add meal" disabled={!hasContent} />
        </View>
    )
}

/**
 * 4b · Inset panel — the four fields grouped inside one inset panel (calorie hero
 * row + P/C/F cells) so manual entry reads as a single quiet unit instead of four
 * loose cells floating under the divider.
 */
export function VariantAiInsetPanel({ hasPremium }: AddNutritionVariantProps) {
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
                <DescribeHero entry={entry} focused={focused} setFocused={setFocused} hasPremium={hasPremium} onGenerated={() => setAiFilled(true)} />
                <ManualDivider />

                <View style={styles.insetPanel}>
                    <View style={[styles.panelCalorieCell, focused === 'calories' && styles.inputFocused]}>
                        <View>
                            <Text style={styles.calorieLabel}>Calories</Text>
                            <Text style={styles.cellUnit}>kcal</Text>
                        </View>
                        <TextInput style={styles.calorieInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros.calories} onChangeText={entry.setMacro('calories')} onFocus={() => setFocused('calories')} onBlur={() => setFocused(null)} keyboardType="numeric" />
                    </View>
                    <View style={styles.panelCellRow}>
                        {(
                            [
                                ['protein', 'Protein'],
                                ['carbs', 'Carbs'],
                                ['fats', 'Fats'],
                            ] as const
                        ).map(([key, label]) => (
                            <View key={key} style={[styles.panelMacroCell, focused === key && styles.inputFocused]}>
                                <Text style={styles.cellLabel}>{label}</Text>
                                <TextInput style={styles.panelMacroCellInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros[key]} onChangeText={entry.setMacro(key)} onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} keyboardType="numeric" />
                                <Text style={styles.cellUnit}>g</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {aiFilled && <Text style={styles.aiEstimateNote}>AI estimate — tap any value to adjust</Text>}
            </ScrollView>
            <FooterCTA label="Add meal" disabled={!hasContent} />
        </View>
    )
}

/**
 * 4c · Collapsible — "Enter manually" is a folded-away card row with a chevron that
 * expands inline, replacing the divider entirely. Generate auto-expands the card and
 * fills it, so AI results land in the same place manual entry lives.
 */
export function VariantAiCollapse({ hasPremium }: AddNutritionVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const entry = useEntryState()
    const [focused, setFocused] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(false)
    const [aiFilled, setAiFilled] = useState(false)

    const hasContent = entry.name.trim().length > 0 || Object.values(entry.macros).some((v) => v.trim().length > 0)

    return (
        <View style={styles.sheet}>
            <SheetHandle />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <DescribeHero
                    entry={entry}
                    focused={focused}
                    setFocused={setFocused}
                    hasPremium={hasPremium}
                    onGenerated={() => {
                        animate()
                        setExpanded(true)
                        setAiFilled(true)
                    }}
                />

                <View style={styles.collapseCard}>
                    <TouchableOpacity
                        style={styles.collapseHeader}
                        activeOpacity={0.6}
                        onPress={() => {
                            animate()
                            setExpanded((prev) => !prev)
                        }}
                    >
                        <Text style={styles.collapseTitle}>Enter manually</Text>
                        {expanded ?
                            <ChevronUp size={18} color={colors.chevron} strokeWidth={2.2} />
                        :   <ChevronDown size={18} color={colors.chevron} strokeWidth={2.2} />}
                    </TouchableOpacity>

                    {expanded && (
                        <View style={styles.collapseBody}>
                            <View style={[styles.innerCalorieCell, focused === 'calories' && styles.inputFocused]}>
                                <View>
                                    <Text style={styles.calorieLabel}>Calories</Text>
                                    <Text style={styles.cellUnit}>kcal</Text>
                                </View>
                                <TextInput style={styles.calorieInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros.calories} onChangeText={entry.setMacro('calories')} onFocus={() => setFocused('calories')} onBlur={() => setFocused(null)} keyboardType="numeric" />
                            </View>
                            <View style={styles.panelCellRow}>
                                {(
                                    [
                                        ['protein', 'Protein'],
                                        ['carbs', 'Carbs'],
                                        ['fats', 'Fats'],
                                    ] as const
                                ).map(([key, label]) => (
                                    <View key={key} style={[styles.innerMacroCell, focused === key && styles.inputFocused]}>
                                        <Text style={styles.cellLabel}>{label}</Text>
                                        <TextInput style={styles.panelMacroCellInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros[key]} onChangeText={entry.setMacro(key)} onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} keyboardType="numeric" />
                                        <Text style={styles.cellUnit}>g</Text>
                                    </View>
                                ))}
                            </View>
                            {aiFilled && <Text style={styles.aiEstimateNoteInner}>AI estimate — tap any value to adjust</Text>}
                        </View>
                    )}
                </View>
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
        scrollContent: {
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 24,
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
        inputFocused: {
            borderColor: colors.nutrition,
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
        aiEstimateNote: {
            fontSize: 12,
            color: colors.nutritionInk,
            fontFamily: fonts.medium,
            marginTop: 10,
        },
        aiEstimateNoteInner: {
            fontSize: 12,
            color: colors.nutritionInk,
            fontFamily: fonts.medium,
            marginTop: 10,
            marginLeft: 2,
        },
        ledgerCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            overflow: 'hidden',
        },
        ledgerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 4,
        },
        ledgerRowBorder: {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.hairline,
        },
        ledgerRowFocused: {
            backgroundColor: colors.nutrition + '0D',
        },
        ledgerLabel: {
            fontSize: 14,
            color: colors.text,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        ledgerInput: {
            flex: 1,
            fontSize: 17,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'right',
            paddingVertical: 10,
            paddingLeft: 12,
        },
        ledgerUnit: {
            width: 36,
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.medium,
            textAlign: 'right',
        },
        insetPanel: {
            backgroundColor: colors.surfaceInset,
            borderRadius: 14,
            padding: 10,
        },
        panelCalorieCell: {
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
        panelCellRow: {
            flexDirection: 'row',
            gap: 10,
        },
        panelMacroCell: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingVertical: 10,
        },
        panelMacroCellInput: {
            alignSelf: 'stretch',
            fontSize: 20,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'center',
            paddingVertical: 2,
        },
        calorieLabel: {
            fontSize: 15,
            color: colors.labelMuted,
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
        collapseCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            marginTop: 18,
            overflow: 'hidden',
        },
        collapseHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 16,
        },
        collapseTitle: {
            fontSize: 15,
            color: colors.text,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        collapseBody: {
            paddingHorizontal: 12,
            paddingBottom: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.hairline,
            paddingTop: 12,
        },
        innerCalorieCell: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surfaceInset,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: 'transparent',
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 10,
        },
        innerMacroCell: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: colors.surfaceInset,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: 'transparent',
            paddingVertical: 10,
        },
    })
}
