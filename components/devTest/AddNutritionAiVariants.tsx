import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Lock, Sparkles } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, LayoutAnimation, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { FooterCTA, SheetHandle, useEntryState, type AddNutritionVariantProps } from './AddNutritionVariants'

/**
 * Dev-only variations on the AI-first add-nutrition layout (VariantAiFirst).
 * Same hero-describe skeleton, three different answers to "where do the macros live":
 * revealed as a review step, folded into the composer, or previewed as the Entry card.
 */

function reveal() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
}

/**
 * 3a · Staged reveal — progressive disclosure. The sheet opens with only the describe
 * field and Generate; the macro fields appear as a review step after AI fills them
 * (or via the manual link). One job per moment, with a Regenerate pill on re-runs.
 */
export function VariantAiReveal({ hasPremium }: AddNutritionVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const entry = useEntryState()
    const [focused, setFocused] = useState<string | null>(null)
    const [revealed, setRevealed] = useState<'ai' | 'manual' | null>(null)

    const hasContent = entry.name.trim().length > 0 || Object.values(entry.macros).some((v) => v.trim().length > 0)

    const generate = () =>
        entry.generate(true, () => {
            reveal()
            setRevealed('ai')
        })

    return (
        <View style={styles.sheet}>
            <SheetHandle />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.heroTitle}>Enter Nutrition</Text>
                <Text style={styles.heroSub}>Describe it — AI fills in the macros</Text>

                <TextInput style={[styles.heroInput, focused === 'name' && styles.inputFocused]} placeholder="e.g. Two eggs on toast with butter, a black coffee" placeholderTextColor={colors.placeholder} value={entry.name} onChangeText={entry.setName} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} multiline textAlignVertical="top" />

                {hasPremium ?
                    <TouchableOpacity activeOpacity={0.8} disabled={entry.generating} style={styles.generatePrimaryTouchable} onPress={generate}>
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

                {revealed === null && (
                    <TouchableOpacity
                        activeOpacity={0.6}
                        style={styles.manualLink}
                        onPress={() => {
                            reveal()
                            setRevealed('manual')
                        }}
                    >
                        <Text style={styles.manualLinkText}>Enter macros manually instead</Text>
                    </TouchableOpacity>
                )}

                {revealed !== null && (
                    <>
                        <View style={styles.sectionRow}>
                            <Text style={styles.fieldLabel}>Macros</Text>
                            {revealed === 'ai' && (
                                <TouchableOpacity style={styles.regenPill} activeOpacity={0.8} disabled={entry.generating} onPress={generate}>
                                    <Sparkles size={12} color={colors.nutritionInk} strokeWidth={2.2} />
                                    <Text style={styles.regenPillText}>Regenerate</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={[styles.calorieCell, focused === 'calories' && styles.inputFocused]}>
                            <View>
                                <Text style={styles.calorieLabel}>Calories</Text>
                                <Text style={styles.cellUnit}>kcal</Text>
                            </View>
                            <TextInput style={styles.calorieInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros.calories} onChangeText={entry.setMacro('calories')} onFocus={() => setFocused('calories')} onBlur={() => setFocused(null)} keyboardType="numeric" />
                        </View>

                        <View style={styles.macroCellRow}>
                            {(
                                [
                                    ['protein', 'Protein'],
                                    ['carbs', 'Carbs'],
                                    ['fats', 'Fats'],
                                ] as const
                            ).map(([key, label]) => (
                                <View key={key} style={[styles.macroCell, focused === key && styles.inputFocused]}>
                                    <Text style={styles.cellLabel}>{label}</Text>
                                    <TextInput style={styles.macroCellInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros[key]} onChangeText={entry.setMacro(key)} onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} keyboardType="numeric" />
                                    <Text style={styles.cellUnit}>g</Text>
                                </View>
                            ))}
                        </View>

                        {revealed === 'ai' && <Text style={styles.aiEstimateNote}>AI estimate — tap any value to adjust</Text>}
                    </>
                )}
            </ScrollView>
            <FooterCTA label="Add meal" disabled={!hasContent} />
        </View>
    )
}

/**
 * 3b · Composer — the describe field is a chat-style composer with the sparkle
 * "send" button inside it, so generating feels like messaging. No separate CTA row,
 * no divider; the macro strip sits directly below and fills in place.
 */
export function VariantAiComposer({ hasPremium }: AddNutritionVariantProps) {
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

                <View style={[styles.composer, focused === 'name' && styles.inputFocused]}>
                    <TextInput style={styles.composerInput} placeholder="Describe your meal…" placeholderTextColor={colors.placeholder} value={entry.name} onChangeText={entry.setName} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} multiline textAlignVertical="top" />
                    <View style={styles.composerFooter}>
                        <Text style={styles.composerHint}>{hasPremium ? 'AI fills in the macros' : 'AI generation is Premium'}</Text>
                        {hasPremium ?
                            <TouchableOpacity activeOpacity={0.8} disabled={entry.generating} onPress={() => entry.generate(true, () => setAiFilled(true))}>
                                <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendButton}>
                                    {entry.generating ?
                                        <ActivityIndicator size="small" color="#FFF" />
                                    :   <Sparkles size={18} color="#FFF" strokeWidth={2.2} />}
                                </LinearGradient>
                            </TouchableOpacity>
                        :   <View style={styles.sendButtonLocked}>
                                <Lock size={16} color={colors.textMuted} strokeWidth={2.2} />
                            </View>
                        }
                    </View>
                </View>

                <Text style={styles.fieldLabel}>Macros</Text>
                <View style={styles.miniCellRow}>
                    {(
                        [
                            ['calories', 'Calories'],
                            ['protein', 'Protein'],
                            ['carbs', 'Carbs'],
                            ['fats', 'Fats'],
                        ] as const
                    ).map(([key, label]) => (
                        <View key={key} style={[styles.miniCell, focused === key && styles.inputFocused]}>
                            <Text style={styles.miniCellLabel}>{label}</Text>
                            <TextInput style={styles.miniCellInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros[key]} onChangeText={entry.setMacro(key)} onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} keyboardType="numeric" />
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
 * 3c · Result card — WYSIWYG. Generating reveals an editable replica of the Entry
 * card exactly as it will appear in the day view (accent bar, ink calories,
 * Fats/Carbs/Protein cells), closing the loop between input and display.
 */
export function VariantAiResultCard({ hasPremium }: AddNutritionVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const entry = useEntryState()
    const [focused, setFocused] = useState<string | null>(null)
    const [revealed, setRevealed] = useState<'ai' | 'manual' | null>(null)

    const hasContent = entry.name.trim().length > 0 || Object.values(entry.macros).some((v) => v.trim().length > 0)

    const generate = () =>
        entry.generate(true, () => {
            reveal()
            setRevealed('ai')
        })

    return (
        <View style={styles.sheet}>
            <SheetHandle />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.heroTitle}>Enter Nutrition</Text>
                <Text style={styles.heroSub}>Describe it — AI fills in the macros</Text>

                <TextInput style={[styles.heroInput, focused === 'name' && styles.inputFocused]} placeholder="e.g. Two eggs on toast with butter, a black coffee" placeholderTextColor={colors.placeholder} value={entry.name} onChangeText={entry.setName} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} multiline textAlignVertical="top" />

                {hasPremium ?
                    <TouchableOpacity activeOpacity={0.8} disabled={entry.generating} style={styles.generatePrimaryTouchable} onPress={generate}>
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

                {revealed === null && (
                    <TouchableOpacity
                        activeOpacity={0.6}
                        style={styles.manualLink}
                        onPress={() => {
                            reveal()
                            setRevealed('manual')
                        }}
                    >
                        <Text style={styles.manualLinkText}>Enter macros manually instead</Text>
                    </TouchableOpacity>
                )}

                {revealed !== null && (
                    <>
                        <View style={styles.sectionRow}>
                            <Text style={styles.fieldLabel}>Preview</Text>
                            {revealed === 'ai' && (
                                <TouchableOpacity style={styles.regenPill} activeOpacity={0.8} disabled={entry.generating} onPress={generate}>
                                    <Sparkles size={12} color={colors.nutritionInk} strokeWidth={2.2} />
                                    <Text style={styles.regenPillText}>Regenerate</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.cardWrapper}>
                            <View style={styles.cardAccentBar} />
                            <View style={styles.cardBody}>
                                <Text style={styles.cardName} numberOfLines={2}>
                                    {entry.name.trim() || 'Unnamed entry'}
                                </Text>
                                <View style={styles.cardCaloriesRow}>
                                    <TextInput style={[styles.cardCaloriesInput, focused === 'calories' && styles.cardInputFocused]} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros.calories} onChangeText={entry.setMacro('calories')} onFocus={() => setFocused('calories')} onBlur={() => setFocused(null)} keyboardType="numeric" />
                                    <Text style={styles.cardCaloriesLabel}>kcal</Text>
                                </View>
                                <View style={styles.cardMacrosRow}>
                                    {(
                                        [
                                            ['fats', 'Fats'],
                                            ['carbs', 'Carbs'],
                                            ['protein', 'Protein'],
                                        ] as const
                                    ).map(([key, label]) => (
                                        <View key={key} style={[styles.cardMacroCell, focused === key && styles.cardInputFocused]}>
                                            <TextInput style={styles.cardMacroInput} placeholder="0" placeholderTextColor={colors.placeholder} value={entry.macros[key]} onChangeText={entry.setMacro(key)} onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} keyboardType="numeric" />
                                            <Text style={styles.cardMacroLabel}>{label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <Text style={styles.aiEstimateNote}>{revealed === 'ai' ? 'This is how it’ll appear in your day — tap values to adjust' : 'This is how it’ll appear in your day'}</Text>
                    </>
                )}
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
        manualLink: {
            alignSelf: 'center',
            marginTop: 16,
            paddingVertical: 4,
            paddingHorizontal: 8,
        },
        manualLinkText: {
            fontSize: 13,
            color: colors.nutritionInk,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        sectionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            marginBottom: 8,
        },
        fieldLabel: {
            fontSize: 13,
            color: colors.labelMuted,
            fontFamily: fonts.semibold,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
        },
        regenPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 5,
            paddingHorizontal: 10,
            backgroundColor: colors.nutrition + '14',
            borderRadius: radius.chip,
            borderWidth: 1,
            borderColor: colors.nutrition + '55',
        },
        regenPillText: {
            fontSize: 12,
            color: colors.nutritionInk,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
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
        aiEstimateNote: {
            fontSize: 12,
            color: colors.nutritionInk,
            fontFamily: fonts.medium,
            marginTop: 10,
        },
        composer: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.hairline,
            marginTop: 12,
        },
        composerInput: {
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 4,
            fontSize: 16,
            lineHeight: 22,
            minHeight: 96,
            color: colors.text,
            fontFamily: fonts.regular,
        },
        composerFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 14,
            paddingRight: 8,
            paddingBottom: 8,
        },
        composerHint: {
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        sendButton: {
            width: 40,
            height: 40,
            borderRadius: radius.iconButton,
            justifyContent: 'center',
            alignItems: 'center',
        },
        sendButtonLocked: {
            width: 40,
            height: 40,
            borderRadius: radius.iconButton,
            backgroundColor: colors.surfaceInset,
            borderWidth: 1,
            borderColor: colors.hairline,
            justifyContent: 'center',
            alignItems: 'center',
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
        cardWrapper: {
            flexDirection: 'row',
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        cardAccentBar: {
            width: 4,
            backgroundColor: colors.nutrition,
        },
        cardBody: {
            flex: 1,
            paddingVertical: 16,
            paddingHorizontal: 16,
        },
        cardName: {
            fontSize: 17,
            color: colors.text,
            letterSpacing: -0.3,
            fontFamily: fonts.bold,
        },
        cardCaloriesRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 5,
            marginTop: 4,
        },
        cardCaloriesInput: {
            fontSize: 20,
            color: colors.nutritionInk,
            letterSpacing: -0.3,
            fontFamily: fonts.extrabold,
            minWidth: 56,
            paddingVertical: 0,
            paddingHorizontal: 0,
            borderBottomWidth: 1,
            borderBottomColor: 'transparent',
        },
        cardCaloriesLabel: {
            fontSize: 11,
            color: colors.labelMuted,
            fontFamily: fonts.medium,
        },
        cardMacrosRow: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
        },
        cardMacroCell: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: colors.surfaceInset,
            borderRadius: radius.macroCell,
            paddingVertical: 9,
            borderWidth: 1,
            borderColor: 'transparent',
        },
        cardMacroInput: {
            alignSelf: 'stretch',
            fontSize: 15,
            color: colors.text,
            letterSpacing: -0.3,
            fontFamily: fonts.bold,
            textAlign: 'center',
            paddingVertical: 0,
        },
        cardMacroLabel: {
            fontSize: 11,
            color: colors.labelMuted,
            marginTop: 1,
            fontFamily: fonts.medium,
        },
        cardInputFocused: {
            borderColor: colors.nutrition,
            borderBottomColor: colors.nutrition,
        },
    })
}
