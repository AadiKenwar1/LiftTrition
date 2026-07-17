import { useNutrition } from '@/context/NutritionContext'
import { applyEdits, itemsForEntry } from '@/context/NutritionContext/functions/entryBuilders'
import { sumItems } from '@/context/NutritionContext/functions/items'
import { Item, NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { parseNumericInput } from '@/lib/utils/number'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Minus, Plus, Trash2 } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import uuid from 'react-native-uuid'

type MacroField = 'calories' | 'protein' | 'carbs' | 'fats'
type DraftItem = { key: string; name: string; brand?: string | null; calories: string; protein: string; carbs: string; fats: string; quantity: string }

const MACROS: { field: MacroField; short: string; unit: string }[] = [
    { field: 'calories', short: 'Cal', unit: 'kcal' },
    { field: 'protein', short: 'P', unit: 'g' },
    { field: 'carbs', short: 'C', unit: 'g' },
    { field: 'fats', short: 'F', unit: 'g' },
]

function toDraft(item: Item): DraftItem {
    return {
        key: uuid.v4() as string,
        name: item.name,
        brand: item.brand ?? null,
        calories: String(item.calories ?? 0),
        protein: String(item.protein ?? 0),
        carbs: String(item.carbs ?? 0),
        fats: String(item.fats ?? 0),
        quantity: String(item.quantity ?? 1),
    }
}

function toItem(draft: DraftItem): Item {
    return {
        name: draft.name.trim(),
        brand: draft.brand?.trim() || null,
        quantity: parseNumericInput(draft.quantity) ?? 1,
        protein: parseNumericInput(draft.protein) ?? 0,
        carbs: parseNumericInput(draft.carbs) ?? 0,
        fats: parseNumericInput(draft.fats) ?? 0,
        calories: parseNumericInput(draft.calories) ?? 0,
    }
}

const qtyValue = (s: string) => parseNumericInput(s) ?? 1

export default function EditEntry() {
    const router = useRouter()
    const { entry: entryParam } = useLocalSearchParams<{ entry: string }>()
    const { handleEditNutrition } = useNutrition()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const entryStr = typeof entryParam === 'string' ? entryParam : entryParam?.[0]
    if (!entryStr) {
        router.back()
        return null
    }

    const raw = JSON.parse(entryStr)
    const parsedEntry: NutritionEntry = {
        ...raw,
        date: new Date(raw.date),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    }

    const [name, setName] = useState(parsedEntry.name)
    const [focused, setFocused] = useState<string | null>(null)
    const [rows, setRows] = useState<DraftItem[]>(() => itemsForEntry(parsedEntry).map(toDraft))

    const totals = sumItems(rows.map(toItem))

    function setField(key: string, field: keyof DraftItem, value: string) {
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
    }

    function stepQty(key: string, delta: number) {
        setRows((prev) =>
            prev.map((r) => {
                if (r.key !== key) return r
                const next = Math.max(0, Math.round((qtyValue(r.quantity) + delta) * 10) / 10)
                return { ...r, quantity: String(next) }
            }),
        )
    }

    function addItem() {
        setRows((prev) => {
            const seeded = prev.length === 1 ? [{ ...prev[0], name: name.trim() || prev[0].name }] : [...prev]
            return [...seeded, { key: uuid.v4() as string, name: '', brand: null, calories: '', protein: '', carbs: '', fats: '', quantity: '1' }]
        })
    }

    function removeItem(key: string) {
        if (rows.length <= 1) {
            Alert.alert('Cannot Remove', 'At least one item is required.')
            return
        }
        setRows((prev) => prev.filter((r) => r.key !== key))
    }

    function handleSave() {
        handleEditNutrition(parsedEntry.id, applyEdits(parsedEntry, name, rows.map(toItem)))
        router.back()
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Edit Entry</Text>
                <Text style={styles.subtitle}>Adjust items — totals update as you type</Text>

                <Text style={styles.fieldLabel}>Meal name</Text>
                <TextInput
                    style={[styles.nameInput, focused === 'meal' && styles.nameInputFocused]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Meal name"
                    placeholderTextColor={colors.placeholder}
                    onFocus={() => setFocused('meal')}
                    onBlur={() => setFocused(null)}
                />

                <Text style={styles.section}>Items</Text>
                {rows.map((row) => {
                    const excluded = qtyValue(row.quantity) === 0
                    return (
                        <View key={row.key} style={styles.card}>
                            <View style={styles.titleRow}>
                                {rows.length > 1 ? (
                                    <TextInput
                                        style={styles.ingName}
                                        value={row.name}
                                        onChangeText={(v) => setField(row.key, 'name', v)}
                                        placeholder="Item"
                                        placeholderTextColor={colors.placeholder}
                                        multiline
                                    />
                                ) : (
                                    <Text style={[styles.ingName, styles.ingNameSynced]} numberOfLines={2}>{name.trim() || row.name}</Text>
                                )}
                                <TouchableOpacity onPress={() => removeItem(row.key)} hitSlop={8} style={styles.trash}>
                                    <Trash2 size={14} color={colors.destructive} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={styles.brandInput}
                                value={row.brand ?? ''}
                                onChangeText={(v) => setField(row.key, 'brand', v)}
                                placeholder="Brand (optional)"
                                placeholderTextColor={colors.placeholder}
                            />

                            <View style={styles.servRow}>
                                <Text style={styles.servLabel}>Servings</Text>
                                <View style={styles.stepRow}>
                                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepQty(row.key, -0.5)} activeOpacity={0.6}>
                                        <Minus size={13} color={colors.nutrition} strokeWidth={2.5} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.stepInput, excluded && styles.stepInputExcluded]}
                                        value={row.quantity}
                                        onChangeText={(v) => setField(row.key, 'quantity', v)}
                                        keyboardType="decimal-pad"
                                        placeholder="1"
                                        placeholderTextColor={colors.placeholder}
                                        selectTextOnFocus
                                    />
                                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepQty(row.key, 0.5)} activeOpacity={0.6}>
                                        <Plus size={13} color={colors.nutrition} strokeWidth={2.5} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.strip}>
                                {MACROS.map((m) => {
                                    const fkey = `${row.key}-${m.field}`
                                    return (
                                        <View key={m.field} style={[styles.cell, focused === fkey && styles.cellFocused]}>
                                            <Text style={styles.cellCap}>{m.short}</Text>
                                            <TextInput
                                                style={styles.cellInput}
                                                value={row[m.field]}
                                                onChangeText={(v) => setField(row.key, m.field, v)}
                                                keyboardType="decimal-pad"
                                                placeholder="0"
                                                placeholderTextColor={colors.placeholder}
                                                selectTextOnFocus
                                                onFocus={() => setFocused(fkey)}
                                                onBlur={() => setFocused(null)}
                                            />
                                            <Text style={styles.cellUnit}>{m.unit}</Text>
                                        </View>
                                    )
                                })}
                            </View>

                            {excluded && <Text style={styles.excluded}>0 servings — excluded from the meal total</Text>}
                        </View>
                    )
                })}

                <TouchableOpacity style={styles.addRow} onPress={addItem} activeOpacity={0.7}>
                    <Plus size={16} color={colors.nutrition} strokeWidth={2.5} />
                    <Text style={styles.addText}>Add item</Text>
                </TouchableOpacity>

                <Text style={styles.totalLabel}>Meal total</Text>
                <View style={[styles.card, styles.totalCard]}>
                    <View style={styles.strip}>
                        {MACROS.map((m) => (
                            <View key={m.field} style={styles.cell}>
                                <Text style={styles.cellCap}>{m.short}</Text>
                                <Text style={styles.cellInput}>{totals[m.field]}</Text>
                                <Text style={styles.cellUnit}>{m.unit}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={styles.saveWrap}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
                        <Text style={styles.saveText}>Save changes</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
        handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
        handle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3 },
        scroll: { flex: 1 },
        content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
        title: { fontSize: 26, color: colors.text, letterSpacing: -0.5, marginTop: 8, fontFamily: fonts.semibold },
        subtitle: { fontSize: 14, color: colors.labelMuted, marginTop: 4, marginBottom: 22, fontFamily: fonts.regular },
        fieldLabel: { fontSize: 12, color: colors.labelMuted, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        nameInput: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: colors.text, borderWidth: 2, borderColor: colors.hairline, fontFamily: fonts.regular, marginBottom: 22 },
        nameInputFocused: { borderColor: colors.nutrition },
        section: { fontSize: 12, color: colors.labelMuted, marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 12, marginBottom: 10 },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
        ingName: { flex: 1, fontSize: 16, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3, paddingVertical: 2 },
        ingNameSynced: { color: colors.labelMuted },
        trash: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceInset },
        brandInput: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.regular, fontStyle: 'italic', paddingVertical: 2, marginTop: -8, marginBottom: 10 },
        servRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
        servLabel: { fontSize: 11, color: colors.nutrition, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fonts.semibold },
        stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceInset, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.nutrition + '66' },
        stepInput: { minWidth: 40, backgroundColor: colors.surfaceInset, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 14, color: colors.text, borderWidth: 1.5, borderColor: colors.nutrition + '66', textAlign: 'center', fontFamily: fonts.semibold },
        stepInputExcluded: { borderColor: colors.destructive + '80', color: colors.destructive },
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
        totalCard: { borderColor: colors.nutrition },
        saveWrap: { borderRadius: 12, overflow: 'hidden', marginTop: 20, shadowColor: colors.nutrition, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
        save: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
        saveText: { fontSize: 16, color: '#FFF', letterSpacing: -0.4, fontFamily: fonts.semibold },
    })
}
