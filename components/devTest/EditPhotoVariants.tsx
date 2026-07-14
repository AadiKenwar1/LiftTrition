import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { parseNumericInput } from '@/lib/utils/number'
import { LinearGradient } from 'expo-linear-gradient'
import { Camera, ChevronDown, Minus, Plus, Trash2 } from 'lucide-react-native'
import { useMemo, useState, type ReactNode } from 'react'
import { LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native'

/**
 * Dev-only redesign harness for editPhotoEntry (AUDIT issue 12).
 * Three distinct ingredient-editor layouts, each baking in the issue-12 fixes so
 * the harness doubles as a correctness demo:
 *   - draft STRING state (type "2.5" and it stays "2.5"; a field can be cleared)
 *   - decimal-pad keyboards
 *   - quantity ?? 1 (an explicit 0 servings contributes 0 to the totals)
 * No persistence — Save is a no-op.
 */

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

export type Scenario = 'default' | 'many' | 'edge'
export type EditPhotoVariantProps = { scenario: Scenario }

type DraftIngredient = {
    key: string
    name: string
    calories: string
    protein: string
    carbs: string
    fats: string
    quantity: string
}

const MACROS = [
    { field: 'calories', label: 'Calories', short: 'Cal', unit: 'kcal' },
    { field: 'protein', label: 'Protein', short: 'P', unit: 'g' },
    { field: 'carbs', label: 'Carbs', short: 'C', unit: 'g' },
    { field: 'fats', label: 'Fats', short: 'F', unit: 'g' },
] as const

type MacroField = (typeof MACROS)[number]['field']

function seed(scenario: Scenario): { name: string; rows: DraftIngredient[] } {
    const base: DraftIngredient[] = [
        { key: 'a', name: 'Grilled chicken breast', calories: '165', protein: '31', carbs: '0', fats: '3.6', quantity: '1.5' },
        { key: 'b', name: 'Jasmine rice', calories: '205', protein: '4', carbs: '45', fats: '0.4', quantity: '1' },
        { key: 'c', name: 'Steamed broccoli', calories: '55', protein: '3.7', carbs: '11', fats: '0.6', quantity: '1' },
        { key: 'd', name: 'Olive oil', calories: '119', protein: '0', carbs: '0', fats: '13.5', quantity: '0.5' },
    ]
    if (scenario === 'many') {
        return {
            name: 'Loaded burrito bowl',
            rows: [
                ...base,
                { key: 'e', name: 'Black beans', calories: '114', protein: '8', carbs: '20', fats: '0.5', quantity: '1' },
                { key: 'f', name: 'Shredded cheese', calories: '110', protein: '7', carbs: '1', fats: '9', quantity: '1' },
                { key: 'g', name: 'Sour cream', calories: '60', protein: '1', carbs: '1', fats: '6', quantity: '2' },
                { key: 'h', name: 'Pico de gallo', calories: '15', protein: '0.5', carbs: '3', fats: '0', quantity: '1' },
            ],
        }
    }
    if (scenario === 'edge') {
        return {
            name: 'Edge cases',
            rows: [
                { key: 'a', name: 'Half serving (0.5)', calories: '250', protein: '12', carbs: '30', fats: '8', quantity: '0.5' },
                { key: 'b', name: 'Zero servings — excluded from totals', calories: '900', protein: '40', carbs: '80', fats: '50', quantity: '0' },
                { key: 'c', name: 'A deliberately very long ingredient name that should wrap or truncate', calories: '80', protein: '2', carbs: '18', fats: '0', quantity: '1' },
            ],
        }
    }
    return { name: 'Chicken & rice', rows: base }
}

// Live-totals parse: missing/cleared macro -> 0; quantity ?? 1 so an explicit 0 counts as 0.
const macroValue = (s: string) => parseNumericInput(s) ?? 0
const qtyValue = (s: string) => parseNumericInput(s) ?? 1

function subtotal(row: DraftIngredient, field: MacroField): number {
    return macroValue(row[field]) * qtyValue(row.quantity)
}

function totals(rows: DraftIngredient[]) {
    const sum = { calories: 0, protein: 0, carbs: 0, fats: 0 }
    for (const row of rows) {
        const q = qtyValue(row.quantity)
        sum.calories += macroValue(row.calories) * q
        sum.protein += macroValue(row.protein) * q
        sum.carbs += macroValue(row.carbs) * q
        sum.fats += macroValue(row.fats) * q
    }
    return {
        calories: Math.round(sum.calories),
        protein: Math.round(sum.protein * 10) / 10,
        carbs: Math.round(sum.carbs * 10) / 10,
        fats: Math.round(sum.fats * 10) / 10,
    }
}

function round1(n: number): number {
    return Math.round(n * 10) / 10
}

function useDraft(scenario: Scenario) {
    const initial = useMemo(() => seed(scenario), [scenario])
    const [mealName, setMealName] = useState(initial.name)
    const [rows, setRows] = useState<DraftIngredient[]>(initial.rows)

    const setField = (key: string, field: keyof DraftIngredient, value: string) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

    const stepQty = (key: string, delta: number) =>
        setRows((prev) =>
            prev.map((r) => {
                if (r.key !== key) return r
                const next = Math.max(0, round1(qtyValue(r.quantity) + delta))
                return { ...r, quantity: String(next) }
            }),
        )

    const remove = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key))
    const add = () => setRows((prev) => [...prev, { key: `n${prev.length}-${prev[prev.length - 1]?.key ?? 'x'}`, name: '', calories: '', protein: '', carbs: '', fats: '', quantity: '1' }])

    return { mealName, setMealName, rows, setField, stepQty, remove, add }
}

/* ---------------------------------------------------------------- shared chrome */

function Shell({ mealName, setMealName, showIcon = true, children }: { mealName: string; setMealName: (v: string) => void; showIcon?: boolean; children: ReactNode }) {
    const colors = useColors()
    const styles = useMemo(() => makeShellStyles(colors), [colors])
    const [focused, setFocused] = useState(false)
    return (
        <View style={styles.container}>
            <View style={styles.handleWrap}>
                <View style={styles.handle} />
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {showIcon && (
                    <View style={styles.iconCircle}>
                        <Camera size={30} color={colors.nutrition} strokeWidth={2.5} />
                    </View>
                )}
                <Text style={[styles.title, !showIcon && styles.titleLeft]}>Edit Photo Entry</Text>
                <Text style={[styles.subtitle, !showIcon && styles.subtitleLeft]}>Adjust ingredients — totals update as you type</Text>

                <Text style={styles.fieldLabel}>Meal name</Text>
                <TextInput
                    style={[styles.nameInput, focused && styles.nameInputFocused]}
                    value={mealName}
                    onChangeText={setMealName}
                    placeholder="Meal name"
                    placeholderTextColor={colors.placeholder}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />

                {children}

                <TouchableOpacity activeOpacity={0.85} style={styles.saveWrap} onPress={() => {}}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
                        <Text style={styles.saveText}>Save changes</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    )
}

function MacroInput({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: object }) {
    const colors = useColors()
    const [focused, setFocused] = useState(false)
    return (
        <TextInput
            style={style}
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            selectTextOnFocus
        />
    )
}

function Stepper({ quantity, onStep, onType, size = 'md' }: { quantity: string; onStep: (d: number) => void; onType: (v: string) => void; size?: 'sm' | 'md' }) {
    const colors = useColors()
    const styles = useMemo(() => makeStepperStyles(colors), [colors])
    const excluded = qtyValue(quantity) === 0
    return (
        <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, size === 'sm' && styles.btnSm]} onPress={() => onStep(-0.5)} activeOpacity={0.6}>
                <Minus size={size === 'sm' ? 13 : 15} color={colors.nutrition} strokeWidth={2.5} />
            </TouchableOpacity>
            <TextInput style={[styles.input, size === 'sm' && styles.inputSm, excluded && styles.inputExcluded]} value={quantity} onChangeText={onType} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.placeholder} selectTextOnFocus />
            <TouchableOpacity style={[styles.btn, size === 'sm' && styles.btnSm]} onPress={() => onStep(0.5)} activeOpacity={0.6}>
                <Plus size={size === 'sm' ? 13 : 15} color={colors.nutrition} strokeWidth={2.5} />
            </TouchableOpacity>
        </View>
    )
}

/* ------------------------------------------------------------ variant 1: ledger */

export function VariantLedger({ scenario }: EditPhotoVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeLedgerStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const t = totals(rows)

    return (
        <Shell mealName={mealName} setMealName={setMealName}>
            <Text style={styles.section}>Ingredients</Text>
            <View style={styles.ledger}>
                {rows.map((row, i) => {
                    const excluded = qtyValue(row.quantity) === 0
                    return (
                        <View key={row.key} style={[styles.line, i > 0 && styles.lineDivider]}>
                            <View style={styles.lineTop}>
                                <TextInput style={styles.name} value={row.name} onChangeText={(v) => setField(row.key, 'name', v)} placeholder="Ingredient" placeholderTextColor={colors.placeholder} />
                                <Stepper quantity={row.quantity} onStep={(d) => stepQty(row.key, d)} onType={(v) => setField(row.key, 'quantity', v)} size="sm" />
                                <TouchableOpacity onPress={() => remove(row.key)} hitSlop={8} style={styles.trash}>
                                    <Trash2 size={15} color={colors.destructive} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.macroStrip}>
                                {MACROS.map((m) => (
                                    <View key={m.field} style={styles.macroCell}>
                                        <Text style={styles.macroCap}>{m.short}</Text>
                                        <MacroInput value={row[m.field]} onChange={(v) => setField(row.key, m.field, v)} style={styles.macroField} />
                                    </View>
                                ))}
                            </View>
                            <Text style={[styles.lineSub, excluded && styles.lineExcluded]}>{excluded ? 'excluded — 0 servings' : `${Math.round(subtotal(row, 'calories'))} kcal in this meal`}</Text>
                        </View>
                    )
                })}
            </View>

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <View style={styles.totalBar}>
                <Text style={styles.totalBarLabel}>Meal total</Text>
                <View style={styles.totalBarRow}>
                    {MACROS.map((m) => (
                        <View key={m.field} style={styles.totalBarCell}>
                            <Text style={styles.totalBarValue}>{t[m.field]}</Text>
                            <Text style={styles.totalBarCap}>{m.short}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Shell>
    )
}

/* --------------------------------------------------------- variant 2: accordion */

export function VariantAccordion({ scenario }: EditPhotoVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeAccordionStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const [open, setOpen] = useState<string | null>(rows[0]?.key ?? null)
    const t = totals(rows)

    const toggle = (key: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity))
        setOpen((cur) => (cur === key ? null : key))
    }

    return (
        <Shell mealName={mealName} setMealName={setMealName}>
            <Text style={styles.section}>Ingredients</Text>
            {rows.map((row) => {
                const expanded = open === row.key
                const excluded = qtyValue(row.quantity) === 0
                return (
                    <View key={row.key} style={[styles.card, expanded && styles.cardOpen]}>
                        <TouchableOpacity style={styles.head} activeOpacity={0.6} onPress={() => toggle(row.key)}>
                            <View style={styles.headText}>
                                <Text style={styles.headName} numberOfLines={1}>
                                    {row.name || 'Ingredient'}
                                </Text>
                                <Text style={[styles.headMeta, excluded && styles.headExcluded]}>{excluded ? '0 servings — excluded' : `×${row.quantity || '1'} · ${Math.round(subtotal(row, 'calories'))} kcal`}</Text>
                            </View>
                            <ChevronDown size={18} color={colors.chevron} strokeWidth={2} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>
                        {expanded && (
                            <View style={styles.body}>
                                <View style={styles.macroGrid}>
                                    {MACROS.map((m) => (
                                        <View key={m.field} style={styles.gridCell}>
                                            <Text style={styles.gridLabel}>
                                                {m.label} <Text style={styles.gridUnit}>({m.unit})</Text>
                                            </Text>
                                            <MacroInput value={row[m.field]} onChange={(v) => setField(row.key, m.field, v)} style={styles.gridInput} />
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.bodyFoot}>
                                    <View>
                                        <Text style={styles.servLabel}>Servings</Text>
                                        <Stepper quantity={row.quantity} onStep={(d) => stepQty(row.key, d)} onType={(v) => setField(row.key, 'quantity', v)} />
                                    </View>
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => remove(row.key)} activeOpacity={0.6}>
                                        <Trash2 size={15} color={colors.destructive} strokeWidth={2} />
                                        <Text style={styles.removeText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )
            })}

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <View style={styles.totalCard}>
                <Text style={styles.totalTitle}>Calculated totals</Text>
                <View style={styles.totalRow}>
                    {MACROS.map((m) => (
                        <View key={m.field} style={styles.totalCol}>
                            <Text style={styles.totalValue}>{t[m.field]}</Text>
                            <Text style={styles.totalCap}>{m.unit}</Text>
                            <Text style={styles.totalName}>{m.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Shell>
    )
}

/* -------------------------------------------------------------- variant 3: tiles */

export function VariantTiles({ scenario }: EditPhotoVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeTilesStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const t = totals(rows)

    return (
        <Shell mealName={mealName} setMealName={setMealName}>
            <Text style={styles.section}>Ingredients</Text>
            {rows.map((row) => {
                const excluded = qtyValue(row.quantity) === 0
                return (
                    <View key={row.key} style={styles.card}>
                        <View style={styles.head}>
                            <TextInput style={styles.name} value={row.name} onChangeText={(v) => setField(row.key, 'name', v)} placeholder="Ingredient" placeholderTextColor={colors.placeholder} />
                            <TouchableOpacity onPress={() => remove(row.key)} hitSlop={8} style={styles.trash}>
                                <Trash2 size={15} color={colors.destructive} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tileGrid}>
                            {MACROS.map((m) => (
                                <View key={m.field} style={styles.tile}>
                                    <Text style={styles.tileCap}>{m.label}</Text>
                                    <MacroInput value={row[m.field]} onChange={(v) => setField(row.key, m.field, v)} style={styles.tileInput} />
                                    <Text style={styles.tileUnit}>{m.unit}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.foot}>
                            <Stepper quantity={row.quantity} onStep={(d) => stepQty(row.key, d)} onType={(v) => setField(row.key, 'quantity', v)} />
                            <Text style={[styles.footSub, excluded && styles.footExcluded]}>{excluded ? 'excluded (0 servings)' : `${Math.round(subtotal(row, 'calories'))} kcal`}</Text>
                        </View>
                    </View>
                )
            })}

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.totalCard}>
                <Text style={styles.totalTitle}>Meal total</Text>
                <View style={styles.totalRow}>
                    {MACROS.map((m) => (
                        <View key={m.field} style={styles.totalCol}>
                            <Text style={styles.totalValue}>{t[m.field]}</Text>
                            <Text style={styles.totalName}>{m.short}</Text>
                        </View>
                    ))}
                </View>
            </LinearGradient>
        </Shell>
    )
}

/* ------------------------------------------ variant 4: inset panel (addNutrition) */

export function VariantInset({ scenario }: EditPhotoVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeInsetStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const [focused, setFocused] = useState<string | null>(null)
    const t = totals(rows)

    const secondary = [
        { field: 'protein', label: 'Protein' },
        { field: 'carbs', label: 'Carbs' },
        { field: 'fats', label: 'Fats' },
    ] as const

    return (
        <Shell mealName={mealName} setMealName={setMealName} showIcon={false}>
            <Text style={styles.section}>Ingredients</Text>
            {rows.map((row) => {
                const excluded = qtyValue(row.quantity) === 0
                const calKey = `${row.key}-calories`
                return (
                    <View key={row.key} style={styles.card}>
                        <View style={styles.head}>
                            <TextInput style={styles.name} value={row.name} onChangeText={(v) => setField(row.key, 'name', v)} placeholder="Ingredient" placeholderTextColor={colors.placeholder} />
                            <TouchableOpacity onPress={() => remove(row.key)} hitSlop={8} style={styles.trash}>
                                <Trash2 size={15} color={colors.destructive} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.panel}>
                            <View style={[styles.calorieCell, focused === calKey && styles.cellFocused]}>
                                <View>
                                    <Text style={styles.calorieLabel}>Calories</Text>
                                    <Text style={styles.cellUnit}>kcal</Text>
                                </View>
                                <TextInput
                                    style={styles.calorieInput}
                                    value={row.calories}
                                    onChangeText={(v) => setField(row.key, 'calories', v)}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.placeholder}
                                    selectTextOnFocus
                                    onFocus={() => setFocused(calKey)}
                                    onBlur={() => setFocused(null)}
                                />
                            </View>
                            <View style={styles.macroRow}>
                                {secondary.map((m) => {
                                    const key = `${row.key}-${m.field}`
                                    return (
                                        <View key={m.field} style={[styles.macroCell, focused === key && styles.cellFocused]}>
                                            <Text style={styles.cellLabel}>{m.label}</Text>
                                            <TextInput
                                                style={styles.macroInput}
                                                value={row[m.field]}
                                                onChangeText={(v) => setField(row.key, m.field, v)}
                                                keyboardType="decimal-pad"
                                                placeholder="0"
                                                placeholderTextColor={colors.placeholder}
                                                selectTextOnFocus
                                                onFocus={() => setFocused(key)}
                                                onBlur={() => setFocused(null)}
                                            />
                                            <Text style={styles.cellUnit}>g</Text>
                                        </View>
                                    )
                                })}
                            </View>
                        </View>

                        <View style={styles.foot}>
                            <View>
                                <Text style={styles.servLabel}>Servings</Text>
                                <Stepper quantity={row.quantity} onStep={(d) => stepQty(row.key, d)} onType={(v) => setField(row.key, 'quantity', v)} />
                            </View>
                            <Text style={[styles.footSub, excluded && styles.footExcluded]}>{excluded ? 'excluded — 0 servings' : `${Math.round(subtotal(row, 'calories'))} kcal in meal`}</Text>
                        </View>
                    </View>
                )
            })}

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <View style={styles.totalPanel}>
                <Text style={styles.totalTitle}>Meal total</Text>
                <View style={[styles.calorieCell, styles.totalCalorieCell]}>
                    <View>
                        <Text style={styles.calorieLabel}>Calories</Text>
                        <Text style={styles.cellUnit}>kcal</Text>
                    </View>
                    <Text style={styles.totalCalorieValue}>{t.calories}</Text>
                </View>
                <View style={styles.macroRow}>
                    {secondary.map((m) => (
                        <View key={m.field} style={styles.macroCell}>
                            <Text style={styles.cellLabel}>{m.label}</Text>
                            <Text style={styles.totalMacroValue}>{t[m.field]}</Text>
                            <Text style={styles.cellUnit}>g</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Shell>
    )
}

const SECONDARY = [
    { field: 'protein', label: 'Protein', short: 'P' },
    { field: 'carbs', label: 'Carbs', short: 'C' },
    { field: 'fats', label: 'Fats', short: 'F' },
] as const

/* ------------------------------------------- variant 4b: inset strip (single band) */

export function VariantInsetStrip({ scenario }: EditPhotoVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStripStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const [focused, setFocused] = useState<string | null>(null)
    const t = totals(rows)

    const strip = (row: DraftIngredient, editable: boolean) => {
        const calKey = `${row.key}-calories`
        return (
            <View style={styles.strip}>
                <View style={[styles.calCell, focused === calKey && styles.cellFocused]}>
                    <Text style={styles.calCap}>Cal</Text>
                    {editable ? (
                        <TextInput style={styles.calInput} value={row.calories} onChangeText={(v) => setField(row.key, 'calories', v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.placeholder} selectTextOnFocus onFocus={() => setFocused(calKey)} onBlur={() => setFocused(null)} />
                    ) : (
                        <Text style={styles.calInput}>{Math.round(subtotal(row, 'calories'))}</Text>
                    )}
                </View>
                {SECONDARY.map((m) => {
                    const key = `${row.key}-${m.field}`
                    return (
                        <View key={m.field} style={[styles.cell, focused === key && styles.cellFocused]}>
                            <Text style={styles.cellCap}>{m.short}</Text>
                            {editable ? (
                                <TextInput style={styles.cellInput} value={row[m.field]} onChangeText={(v) => setField(row.key, m.field, v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.placeholder} selectTextOnFocus onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} />
                            ) : (
                                <Text style={styles.cellInput}>{round1(subtotal(row, m.field))}</Text>
                            )}
                        </View>
                    )
                })}
            </View>
        )
    }

    return (
        <Shell mealName={mealName} setMealName={setMealName} showIcon={false}>
            <Text style={styles.section}>Ingredients</Text>
            {rows.map((row) => {
                const excluded = qtyValue(row.quantity) === 0
                return (
                    <View key={row.key} style={styles.card}>
                        <View style={styles.head}>
                            <TextInput style={styles.name} value={row.name} onChangeText={(v) => setField(row.key, 'name', v)} placeholder="Ingredient" placeholderTextColor={colors.placeholder} />
                            <Stepper quantity={row.quantity} onStep={(d) => stepQty(row.key, d)} onType={(v) => setField(row.key, 'quantity', v)} size="sm" />
                            <TouchableOpacity onPress={() => remove(row.key)} hitSlop={8} style={styles.trash}>
                                <Trash2 size={15} color={colors.destructive} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                        {strip(row, true)}
                        {excluded && <Text style={styles.excluded}>0 servings — excluded from the meal total</Text>}
                    </View>
                )
            })}

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <Text style={styles.totalLabel}>Meal total</Text>
            <View style={[styles.card, styles.totalCard]}>
                <View style={styles.strip}>
                    <View style={[styles.calCell, styles.calTotal]}>
                        <Text style={styles.calCap}>Cal</Text>
                        <Text style={styles.calInput}>{t.calories}</Text>
                    </View>
                    {SECONDARY.map((m) => (
                        <View key={m.field} style={styles.cell}>
                            <Text style={styles.cellCap}>{m.short}</Text>
                            <Text style={styles.cellInput}>{t[m.field]}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Shell>
    )
}

/* --------------------------------------- variant 4c: calorie in header (one band) */

export function VariantInsetHeader({ scenario }: EditPhotoVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeHeaderStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const [focused, setFocused] = useState<string | null>(null)
    const t = totals(rows)

    return (
        <Shell mealName={mealName} setMealName={setMealName} showIcon={false}>
            <Text style={styles.section}>Ingredients</Text>
            {rows.map((row) => {
                const excluded = qtyValue(row.quantity) === 0
                const calKey = `${row.key}-calories`
                return (
                    <View key={row.key} style={styles.card}>
                        <View style={styles.head}>
                            <TextInput style={styles.name} value={row.name} onChangeText={(v) => setField(row.key, 'name', v)} placeholder="Ingredient" placeholderTextColor={colors.placeholder} multiline />
                            <View style={[styles.calBadge, focused === calKey && styles.cellFocused]}>
                                <TextInput style={styles.calInput} value={row.calories} onChangeText={(v) => setField(row.key, 'calories', v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.placeholder} selectTextOnFocus onFocus={() => setFocused(calKey)} onBlur={() => setFocused(null)} />
                                <Text style={styles.calUnit}>kcal</Text>
                            </View>
                            <TouchableOpacity onPress={() => remove(row.key)} hitSlop={8} style={styles.trash}>
                                <Trash2 size={14} color={colors.destructive} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.band}>
                            {SECONDARY.map((m) => {
                                const key = `${row.key}-${m.field}`
                                return (
                                    <View key={m.field} style={[styles.cell, focused === key && styles.cellFocused]}>
                                        <Text style={styles.cellCap}>{m.short}</Text>
                                        <TextInput style={styles.cellInput} value={row[m.field]} onChangeText={(v) => setField(row.key, m.field, v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.placeholder} selectTextOnFocus onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} />
                                        <Text style={styles.cellUnit}>g</Text>
                                    </View>
                                )
                            })}
                            <View style={styles.stepWrap}>
                                <Stepper quantity={row.quantity} onStep={(d) => stepQty(row.key, d)} onType={(v) => setField(row.key, 'quantity', v)} size="sm" />
                            </View>
                        </View>
                        {excluded && <Text style={styles.excluded}>0 servings — excluded from the meal total</Text>}
                    </View>
                )
            })}

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <View style={[styles.card, styles.totalCard]}>
                <View style={styles.head}>
                    <Text style={styles.totalName}>Meal total</Text>
                    <View style={[styles.calBadge, styles.calBadgeTotal]}>
                        <Text style={styles.calInput}>{t.calories}</Text>
                        <Text style={styles.calUnit}>kcal</Text>
                    </View>
                </View>
                <View style={styles.band}>
                    {SECONDARY.map((m) => (
                        <View key={m.field} style={styles.cell}>
                            <Text style={styles.cellCap}>{m.short}</Text>
                            <Text style={styles.cellInput}>{t[m.field]}</Text>
                            <Text style={styles.cellUnit}>g</Text>
                        </View>
                    ))}
                    <View style={styles.stepWrap} />
                </View>
            </View>
        </Shell>
    )
}

/* -------------------------------------------- variant 4d: two-column split (short) */

export function VariantInsetSplit({ scenario }: EditPhotoVariantProps) {
    const colors = useColors()
    const styles = useMemo(() => makeSplitStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const [focused, setFocused] = useState<string | null>(null)
    const t = totals(rows)

    const tile = (row: DraftIngredient, field: MacroField, cap: string, unit: string) => {
        const key = `${row.key}-${field}`
        return (
            <View style={[styles.tile, focused === key && styles.cellFocused]}>
                <Text style={styles.tileCap}>{cap}</Text>
                <TextInput style={styles.tileInput} value={row[field]} onChangeText={(v) => setField(row.key, field, v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.placeholder} selectTextOnFocus onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} />
                <Text style={styles.tileUnit}>{unit}</Text>
            </View>
        )
    }

    return (
        <Shell mealName={mealName} setMealName={setMealName} showIcon={false}>
            <Text style={styles.section}>Ingredients</Text>
            {rows.map((row) => {
                const excluded = qtyValue(row.quantity) === 0
                return (
                    <View key={row.key} style={styles.card}>
                        <View style={styles.left}>
                            <TextInput style={styles.name} value={row.name} onChangeText={(v) => setField(row.key, 'name', v)} placeholder="Ingredient" placeholderTextColor={colors.placeholder} multiline />
                            <View>
                                <Text style={styles.servLabel}>Servings</Text>
                                <Stepper quantity={row.quantity} onStep={(d) => stepQty(row.key, d)} onType={(v) => setField(row.key, 'quantity', v)} size="sm" />
                                {excluded && <Text style={styles.excluded}>excluded</Text>}
                            </View>
                            <TouchableOpacity onPress={() => remove(row.key)} hitSlop={8} style={styles.trash}>
                                <Trash2 size={14} color={colors.destructive} strokeWidth={2} />
                                <Text style={styles.trashText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.grid}>
                            {tile(row, 'calories', 'Cal', 'kcal')}
                            {tile(row, 'protein', 'P', 'g')}
                            {tile(row, 'carbs', 'C', 'g')}
                            {tile(row, 'fats', 'F', 'g')}
                        </View>
                    </View>
                )
            })}

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <View style={[styles.card, styles.totalCard]}>
                <View style={styles.left}>
                    <Text style={styles.totalName}>Meal total</Text>
                </View>
                <View style={styles.grid}>
                    <View style={styles.tile}>
                        <Text style={styles.tileCap}>Cal</Text>
                        <Text style={styles.tileInput}>{t.calories}</Text>
                        <Text style={styles.tileUnit}>kcal</Text>
                    </View>
                    <View style={styles.tile}>
                        <Text style={styles.tileCap}>P</Text>
                        <Text style={styles.tileInput}>{t.protein}</Text>
                        <Text style={styles.tileUnit}>g</Text>
                    </View>
                    <View style={styles.tile}>
                        <Text style={styles.tileCap}>C</Text>
                        <Text style={styles.tileInput}>{t.carbs}</Text>
                        <Text style={styles.tileUnit}>g</Text>
                    </View>
                    <View style={styles.tile}>
                        <Text style={styles.tileCap}>F</Text>
                        <Text style={styles.tileInput}>{t.fats}</Text>
                        <Text style={styles.tileUnit}>g</Text>
                    </View>
                </View>
            </View>
        </Shell>
    )
}

/* ---------------------------------- variant 4e: split header + macro row underneath */

type ServingsStyle = 'stepper' | 'chips' | 'pill' | 'field'
const SERV_PRESETS = [0.5, 1, 1.5, 2, 3]

function SplitRowBase({ scenario, servingsStyle }: EditPhotoVariantProps & { servingsStyle: ServingsStyle }) {
    const colors = useColors()
    const styles = useMemo(() => makeSplitRowStyles(colors), [colors])
    const { mealName, setMealName, rows, setField, stepQty, remove, add } = useDraft(scenario)
    const [focused, setFocused] = useState<string | null>(null)
    const t = totals(rows)

    const renderServings = (row: DraftIngredient) => {
        const setQty = (v: string) => setField(row.key, 'quantity', v)
        const step = (d: number) => stepQty(row.key, d)
        const current = qtyValue(row.quantity)

        if (servingsStyle === 'chips') {
            return (
                <View style={styles.servCol}>
                    <Text style={styles.servLabel}>Servings</Text>
                    <View style={styles.chipRow}>
                        {SERV_PRESETS.map((v) => {
                            const active = current === v
                            return (
                                <TouchableOpacity key={v} style={[styles.chip, active && styles.chipActive]} onPress={() => setQty(String(v))} activeOpacity={0.7}>
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{v}</Text>
                                </TouchableOpacity>
                            )
                        })}
                        <TextInput style={styles.chipField} value={row.quantity} onChangeText={setQty} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={colors.placeholder} selectTextOnFocus />
                    </View>
                </View>
            )
        }

        if (servingsStyle === 'pill') {
            return (
                <View style={styles.pill}>
                    <TouchableOpacity style={styles.pillBtn} onPress={() => step(-0.5)} activeOpacity={0.6}>
                        <Minus size={15} color={colors.nutrition} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TextInput style={styles.pillValue} value={row.quantity} onChangeText={setQty} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.placeholder} selectTextOnFocus />
                    <Text style={styles.pillSuffix}>servings</Text>
                    <TouchableOpacity style={styles.pillBtn} onPress={() => step(0.5)} activeOpacity={0.6}>
                        <Plus size={15} color={colors.nutrition} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            )
        }

        if (servingsStyle === 'field') {
            return (
                <View style={styles.servRow}>
                    <Text style={styles.servLabel}>Servings</Text>
                    <TextInput style={styles.fieldInput} value={row.quantity} onChangeText={setQty} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.placeholder} selectTextOnFocus />
                </View>
            )
        }

        return (
            <View style={styles.servRow}>
                <Text style={styles.servLabel}>Servings</Text>
                <Stepper quantity={row.quantity} onStep={step} onType={setQty} size="sm" />
            </View>
        )
    }

    const macroStrip = (row: DraftIngredient | null) => (
        <View style={styles.strip}>
            {MACROS.map((m) => {
                const key = row ? `${row.key}-${m.field}` : m.field
                return (
                    <View key={m.field} style={[styles.cell, row && focused === key && styles.cellFocused]}>
                        <Text style={styles.cellCap}>{m.short}</Text>
                        {row ? (
                            <TextInput style={styles.cellInput} value={row[m.field]} onChangeText={(v) => setField(row.key, m.field, v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.placeholder} selectTextOnFocus onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} />
                        ) : (
                            <Text style={styles.cellInput}>{t[m.field]}</Text>
                        )}
                        <Text style={styles.cellUnit}>{m.unit}</Text>
                    </View>
                )
            })}
        </View>
    )

    return (
        <Shell mealName={mealName} setMealName={setMealName} showIcon={false}>
            <Text style={styles.section}>Ingredients</Text>
            {rows.map((row) => {
                const excluded = qtyValue(row.quantity) === 0
                return (
                    <View key={row.key} style={styles.card}>
                        <View style={styles.titleRow}>
                            <TextInput style={styles.name} value={row.name} onChangeText={(v) => setField(row.key, 'name', v)} placeholder="Ingredient" placeholderTextColor={colors.placeholder} multiline />
                            <TouchableOpacity onPress={() => remove(row.key)} hitSlop={8} style={styles.trash}>
                                <Trash2 size={14} color={colors.destructive} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                        {renderServings(row)}
                        {macroStrip(row)}
                        {excluded && <Text style={styles.excluded}>0 servings — excluded from the meal total</Text>}
                    </View>
                )
            })}

            <TouchableOpacity style={styles.addRow} onPress={add} activeOpacity={0.7}>
                <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                <Text style={styles.addText}>Add ingredient</Text>
            </TouchableOpacity>

            <Text style={styles.totalLabel}>Meal total</Text>
            <View style={[styles.card, styles.totalCardBorder]}>{macroStrip(null)}</View>
        </Shell>
    )
}

export const VariantInsetSplitRow = (p: EditPhotoVariantProps) => <SplitRowBase {...p} servingsStyle="stepper" />
export const VariantServingsChips = (p: EditPhotoVariantProps) => <SplitRowBase {...p} servingsStyle="chips" />
export const VariantServingsPill = (p: EditPhotoVariantProps) => <SplitRowBase {...p} servingsStyle="pill" />
export const VariantServingsField = (p: EditPhotoVariantProps) => <SplitRowBase {...p} servingsStyle="field" />

/* -------------------------------------------------------------------- stylesheets */

function makeShellStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
        handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
        handle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3 },
        scroll: { flex: 1 },
        content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
        iconCircle: { alignSelf: 'center', width: 68, height: 68, borderRadius: 34, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.nutrition, marginTop: 8, marginBottom: 14 },
        title: { fontSize: 23, color: colors.text, textAlign: 'center', letterSpacing: -0.5, fontFamily: fonts.semibold },
        titleLeft: { textAlign: 'left', fontSize: 26, marginTop: 8 },
        subtitle: { fontSize: 14, color: colors.labelMuted, textAlign: 'center', marginTop: 4, marginBottom: 22, fontFamily: fonts.regular },
        subtitleLeft: { textAlign: 'left' },
        fieldLabel: { fontSize: 12, color: colors.labelMuted, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        nameInput: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: colors.text, borderWidth: 2, borderColor: colors.hairline, fontFamily: fonts.regular, marginBottom: 20 },
        nameInputFocused: { borderColor: colors.nutrition },
        saveWrap: { borderRadius: 12, overflow: 'hidden', marginTop: 20, shadowColor: colors.nutrition, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
        save: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
        saveText: { fontSize: 16, color: '#FFF', letterSpacing: -0.4, fontFamily: fonts.semibold },
    })
}

function makeStepperStyles(colors: Colors) {
    return StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        btn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceInset, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.nutrition + '66' },
        btnSm: { width: 28, height: 28, borderRadius: 14 },
        input: { minWidth: 46, backgroundColor: colors.surfaceInset, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.nutrition + '66', textAlign: 'center', fontFamily: fonts.semibold },
        inputSm: { minWidth: 40, fontSize: 14, paddingVertical: 5 },
        inputExcluded: { borderColor: colors.destructive + '80', color: colors.destructive },
    })
}

function makeLedgerStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        ledger: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14 },
        line: { paddingVertical: 14 },
        lineDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
        lineTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        name: { flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3, paddingVertical: 2 },
        trash: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceInset },
        macroStrip: { flexDirection: 'row', gap: 8, marginTop: 10 },
        macroCell: { flex: 1, alignItems: 'center' },
        macroCap: { fontSize: 11, color: colors.labelMuted, marginBottom: 4, fontFamily: fonts.semibold },
        macroField: { width: '100%', backgroundColor: colors.surfaceInset, borderRadius: 8, paddingVertical: 8, fontSize: 14, color: colors.text, textAlign: 'center', fontFamily: fonts.regular },
        lineSub: { fontSize: 12, color: colors.textMuted, marginTop: 9, textAlign: 'right', fontFamily: fonts.regular },
        lineExcluded: { color: colors.destructive },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 14, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalBar: { marginTop: 18, backgroundColor: colors.nutrition + '14', borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.nutrition, paddingVertical: 16, paddingHorizontal: 16 },
        totalBarLabel: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, fontFamily: fonts.semibold },
        totalBarRow: { flexDirection: 'row', justifyContent: 'space-between' },
        totalBarCell: { alignItems: 'center', flex: 1 },
        totalBarValue: { fontSize: 22, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.5 },
        totalBarCap: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontFamily: fonts.regular },
    })
}

function makeAccordionStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 10, overflow: 'hidden' },
        cardOpen: { borderColor: colors.nutrition + '80' },
        head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
        headText: { flex: 1 },
        headName: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        headMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3, fontFamily: fonts.regular },
        headExcluded: { color: colors.destructive },
        body: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 14 },
        macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        gridCell: { width: '47%', flexGrow: 1 },
        gridLabel: { fontSize: 12, color: colors.labelMuted, marginBottom: 6, fontFamily: fonts.semibold },
        gridUnit: { color: colors.textMuted, fontFamily: fonts.regular },
        gridInput: { backgroundColor: colors.surfaceInset, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.hairline, fontFamily: fonts.regular },
        bodyFoot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 },
        servLabel: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7, fontFamily: fonts.semibold },
        removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surfaceInset },
        removeText: { fontSize: 13, color: colors.destructive, fontFamily: fonts.semibold },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 6, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalCard: { marginTop: 18, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.nutrition, paddingVertical: 18, paddingHorizontal: 16 },
        totalTitle: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, textAlign: 'center', fontFamily: fonts.semibold },
        totalRow: { flexDirection: 'row', justifyContent: 'space-around' },
        totalCol: { alignItems: 'center', flex: 1 },
        totalValue: { fontSize: 20, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.5 },
        totalCap: { fontSize: 11, color: colors.nutrition, marginTop: 2, fontFamily: fonts.semibold },
        totalName: { fontSize: 11, color: colors.textMuted, marginTop: 3, fontFamily: fonts.regular },
    })
}

function makeInsetStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 12 },
        head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
        name: { flex: 1, fontSize: 16, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3, backgroundColor: colors.surfaceInset, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
        trash: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceInset },
        panel: { backgroundColor: colors.surfaceInset, borderRadius: 14, padding: 10 },
        calorieCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 1, borderColor: colors.hairline, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
        cellFocused: { borderColor: colors.nutrition },
        calorieLabel: { fontSize: 15, color: colors.labelMuted, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        calorieInput: { flex: 1, fontSize: 24, color: colors.text, fontFamily: fonts.bold, textAlign: 'right', paddingVertical: 4, paddingLeft: 12 },
        macroRow: { flexDirection: 'row', gap: 10 },
        macroCell: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 1, borderColor: colors.hairline, paddingVertical: 10 },
        macroInput: { alignSelf: 'stretch', fontSize: 20, color: colors.text, fontFamily: fonts.bold, textAlign: 'center', paddingVertical: 2 },
        cellLabel: { fontSize: 12, color: colors.labelMuted, fontFamily: fonts.medium },
        cellUnit: { fontSize: 11, color: colors.textMuted, fontFamily: fonts.medium },
        foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
        servLabel: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7, fontFamily: fonts.semibold },
        footSub: { fontSize: 14, color: colors.textMuted, fontFamily: fonts.semibold },
        footExcluded: { color: colors.destructive },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 2, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalPanel: { marginTop: 18, backgroundColor: colors.surfaceInset, borderRadius: 14, padding: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.nutrition },
        totalTitle: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4, fontFamily: fonts.semibold },
        totalCalorieCell: { marginBottom: 10 },
        totalCalorieValue: { fontSize: 24, color: colors.text, fontFamily: fonts.bold, letterSpacing: -0.5 },
        totalMacroValue: { fontSize: 20, color: colors.text, fontFamily: fonts.bold, paddingVertical: 2 },
    })
}

function makeStripStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, marginBottom: 10 },
        head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
        name: { flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3, paddingVertical: 2 },
        trash: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceInset },
        strip: { flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceInset, borderRadius: 12, padding: 6 },
        calCell: { flex: 1.5, alignItems: 'center', backgroundColor: colors.nutrition + '1F', borderRadius: 9, borderWidth: 1, borderColor: colors.nutrition + '30', paddingVertical: 8 },
        calTotal: { backgroundColor: colors.nutrition + '2E' },
        cell: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 9, borderWidth: 1, borderColor: colors.hairline, paddingVertical: 8 },
        cellFocused: { borderColor: colors.nutrition },
        calCap: { fontSize: 10, color: colors.nutrition, marginBottom: 2, fontFamily: fonts.semibold },
        cellCap: { fontSize: 10, color: colors.labelMuted, marginBottom: 2, fontFamily: fonts.semibold },
        calInput: { alignSelf: 'stretch', fontSize: 17, color: colors.text, fontFamily: fonts.bold, textAlign: 'center', paddingVertical: 1 },
        cellInput: { alignSelf: 'stretch', fontSize: 15, color: colors.text, fontFamily: fonts.semibold, textAlign: 'center', paddingVertical: 1 },
        excluded: { fontSize: 12, color: colors.destructive, marginTop: 8, fontFamily: fonts.regular },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalLabel: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8, marginLeft: 2, fontFamily: fonts.semibold },
        totalCard: { borderColor: colors.nutrition, marginBottom: 0 },
    })
}

function makeHeaderStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, marginBottom: 10 },
        head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
        name: { flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3, paddingVertical: 2 },
        calBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 4, backgroundColor: colors.nutrition + '1F', borderRadius: 10, borderWidth: 1, borderColor: colors.nutrition + '30', paddingHorizontal: 12, paddingVertical: 7, minWidth: 84, justifyContent: 'flex-end' },
        calBadgeTotal: { backgroundColor: colors.nutrition + '2E' },
        cellFocused: { borderColor: colors.nutrition },
        calInput: { fontSize: 20, color: colors.text, fontFamily: fonts.bold, textAlign: 'right', minWidth: 34, paddingVertical: 0 },
        calUnit: { fontSize: 11, color: colors.nutrition, fontFamily: fonts.semibold },
        trash: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceInset },
        band: { flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceInset, borderRadius: 12, padding: 6, alignItems: 'center' },
        cell: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 9, borderWidth: 1, borderColor: colors.hairline, paddingVertical: 7 },
        cellCap: { fontSize: 10, color: colors.labelMuted, marginBottom: 1, fontFamily: fonts.semibold },
        cellInput: { alignSelf: 'stretch', fontSize: 15, color: colors.text, fontFamily: fonts.bold, textAlign: 'center', paddingVertical: 1 },
        cellUnit: { fontSize: 9, color: colors.textMuted, fontFamily: fonts.medium },
        stepWrap: { flexShrink: 0, paddingLeft: 2 },
        excluded: { fontSize: 12, color: colors.destructive, marginTop: 8, fontFamily: fonts.regular },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalCard: { borderColor: colors.nutrition, marginTop: 14, marginBottom: 0 },
        totalName: { flex: 1, fontSize: 14, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.semibold },
    })
}

function makeSplitStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, marginBottom: 10 },
        left: { width: '38%', justifyContent: 'space-between', gap: 12 },
        name: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        servLabel: { fontSize: 10, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontFamily: fonts.semibold },
        excluded: { fontSize: 11, color: colors.destructive, marginTop: 6, fontFamily: fonts.regular },
        trash: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        trashText: { fontSize: 12, color: colors.destructive, fontFamily: fonts.semibold },
        grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        tile: { width: '47%', flexGrow: 1, alignItems: 'center', backgroundColor: colors.surfaceInset, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, paddingVertical: 8 },
        cellFocused: { borderColor: colors.nutrition },
        tileCap: { fontSize: 10, color: colors.labelMuted, marginBottom: 1, fontFamily: fonts.semibold },
        tileInput: { alignSelf: 'stretch', fontSize: 17, color: colors.text, fontFamily: fonts.bold, textAlign: 'center', paddingVertical: 1 },
        tileUnit: { fontSize: 9, color: colors.textMuted, fontFamily: fonts.medium },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalCard: { borderColor: colors.nutrition, alignItems: 'center', marginTop: 14, marginBottom: 0 },
        totalName: { fontSize: 13, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.semibold },
    })
}

function makeSplitRowStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, marginBottom: 10 },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
        name: { flex: 1, fontSize: 16, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3, paddingVertical: 2 },
        trash: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceInset },
        servRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
        servCol: { marginBottom: 12 },
        servLabel: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.semibold },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
        chip: { minWidth: 42, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.chip, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surfaceInset },
        chipActive: { backgroundColor: colors.nutrition, borderColor: colors.nutrition },
        chipText: { fontSize: 13, color: colors.textSecondary, fontFamily: fonts.semibold },
        chipTextActive: { color: '#fff' },
        chipField: { minWidth: 52, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.nutrition + '55', backgroundColor: colors.surfaceInset, textAlign: 'center', color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
        pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 10, backgroundColor: colors.surfaceInset, borderRadius: 24, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 12 },
        pillBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.nutrition + '66' },
        pillValue: { fontSize: 17, color: colors.text, fontFamily: fonts.bold, minWidth: 30, textAlign: 'center', paddingVertical: 0 },
        pillSuffix: { fontSize: 13, color: colors.labelMuted, fontFamily: fonts.medium, marginRight: 4 },
        fieldInput: { minWidth: 72, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surfaceInset, textAlign: 'center', color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
        strip: { flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceInset, borderRadius: 12, padding: 6 },
        cell: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 9, borderWidth: 1, borderColor: colors.hairline, paddingVertical: 9 },
        cellFocused: { borderColor: colors.nutrition },
        cellCap: { fontSize: 10, color: colors.labelMuted, marginBottom: 2, fontFamily: fonts.semibold },
        cellInput: { alignSelf: 'stretch', fontSize: 17, color: colors.text, fontFamily: fonts.bold, textAlign: 'center', paddingVertical: 1 },
        cellUnit: { fontSize: 9, color: colors.textMuted, marginTop: 2, fontFamily: fonts.medium },
        excluded: { fontSize: 12, color: colors.destructive, marginTop: 8, fontFamily: fonts.regular },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalLabel: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8, marginLeft: 2, fontFamily: fonts.semibold },
        totalCardBorder: { borderColor: colors.nutrition, marginBottom: 0 },
    })
}

function makeTilesStyles(colors: Colors) {
    return StyleSheet.create({
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 12 },
        head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
        name: { flex: 1, fontSize: 16, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3, backgroundColor: colors.surfaceInset, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
        trash: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceInset },
        tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        tile: { width: '47.5%', flexGrow: 1, backgroundColor: colors.surfaceInset, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.hairline },
        tileCap: { fontSize: 11, color: colors.textMuted, marginBottom: 2, fontFamily: fonts.semibold },
        tileInput: { fontSize: 20, color: colors.text, paddingVertical: 2, fontFamily: fonts.semibold, letterSpacing: -0.5 },
        tileUnit: { fontSize: 10, color: colors.placeholder, fontFamily: fonts.regular },
        foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
        footSub: { fontSize: 14, color: colors.textMuted, fontFamily: fonts.semibold },
        footExcluded: { color: colors.destructive },
        addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 2, borderRadius: 12, backgroundColor: colors.nutrition + '14', borderWidth: 1, borderColor: colors.nutrition + '55' },
        addText: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        totalCard: { marginTop: 18, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 16 },
        totalTitle: { fontSize: 11, color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, textAlign: 'center', opacity: 0.9, fontFamily: fonts.semibold },
        totalRow: { flexDirection: 'row', justifyContent: 'space-around' },
        totalCol: { alignItems: 'center', flex: 1 },
        totalValue: { fontSize: 22, color: '#FFF', fontFamily: fonts.semibold, letterSpacing: -0.5 },
        totalName: { fontSize: 11, color: '#FFF', marginTop: 3, opacity: 0.85, fontFamily: fonts.semibold },
    })
}
