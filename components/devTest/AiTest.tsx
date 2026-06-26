import { useAuth } from '@/context/AuthContext'
import { runPhotoAnalysis, type IngredientSource } from '@/context/NutritionContext/functions/aiFunctions'
import { NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { processPickedImageUri, type ScanMode } from '@/lib/openAI/mealImage'
import { askOpenAIText } from '@/lib/openAI/openAI'
import { Asset } from 'expo-asset'
import * as ImagePicker from 'expo-image-picker'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

const TEXT_PRESETS = ['Chicken, Pasta, Broccoli', '2 oranges', 'Grilled chicken salad', 'asdfqwer']

// Dev-only bundled fixtures (stripped from production with this whole __DEV__ component).
const SAMPLES: { label: string; mode: ScanMode; module: number }[] = [
    { label: 'Meal', mode: 'meal', module: require('../../assets/devTest/meal.jpg') },
    { label: 'Branded', mode: 'meal', module: require('../../assets/devTest/branded.jpg') },
    { label: 'Label', mode: 'label', module: require('../../assets/devTest/label.jpg') },
]

type Macros = { calories: number; protein: number; carbs: number; fats: number }
type TextResult = { ms: number; raw?: string; macros?: Macros; allZero?: boolean; error?: string }
type PhotoResult = { ms: number; entry?: NutritionEntry; sources?: IngredientSource[]; error?: string }

function parseMacros(raw: string): Macros | null {
    let c = raw.trim()
    if (c.startsWith('```')) c = c.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    try {
        const d = JSON.parse(c)
        return {
            calories: Math.round(d.calories || 0),
            protein: Math.round((d.protein || 0) * 10) / 10,
            carbs: Math.round((d.carbs || 0) * 10) / 10,
            fats: Math.round((d.fats || 0) * 10) / 10,
        }
    } catch {
        return null
    }
}

function sourceFor(sources: IngredientSource[] | undefined, ing: { name: string; brand?: string | null }): string {
    if (!ing.brand) return 'estimate'
    return sources?.find((s) => s.name === ing.name && s.brand === ing.brand?.trim())?.source ?? 'vision'
}

export default function AiTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { userID } = useAuth()
    const [loading, setLoading] = useState(false)

    const [question, setQuestion] = useState(TEXT_PRESETS[0])
    const [textResult, setTextResult] = useState<TextResult | null>(null)

    const [scanMode, setScanMode] = useState<ScanMode>('meal')
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null)

    async function handleTextTest() {
        if (!question.trim()) return
        setLoading(true)
        setTextResult(null)
        const start = Date.now()
        try {
            // Call the edge function directly (raw) so we can SEE the server response — an all-zero
            // payload means the prompt/model isn't deployed, which analyzeText would hide as a guard error.
            const raw = await askOpenAIText(question.trim())
            const macros = parseMacros(raw) ?? undefined
            const allZero = !!macros && macros.calories === 0 && macros.protein === 0 && macros.carbs === 0 && macros.fats === 0
            setTextResult({ ms: Date.now() - start, raw, macros, allZero })
        } catch (error: any) {
            setTextResult({ ms: Date.now() - start, error: error?.message ?? 'Failed' })
        } finally {
            setLoading(false)
        }
    }

    async function loadSample(sample: (typeof SAMPLES)[number]) {
        try {
            const asset = Asset.fromModule(sample.module)
            await asset.downloadAsync()
            if (asset.localUri) {
                setScanMode(sample.mode)
                setSelectedImage(asset.localUri)
                setPhotoResult(null)
            }
        } catch {
            Alert.alert('Error', 'Could not load sample image')
        }
    }

    async function pickImage() {
        const res = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!res.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library')
            return
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
        if (!result.canceled && result.assets[0]?.uri) setSelectedImage(result.assets[0].uri)
    }

    async function takePhoto() {
        const res = await ImagePicker.requestCameraPermissionsAsync()
        if (!res.granted) {
            Alert.alert('Permission Required', 'Please allow camera access')
            return
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
        if (!result.canceled && result.assets[0]?.uri) setSelectedImage(result.assets[0].uri)
    }

    async function handleVisionTest() {
        if (!selectedImage) return
        setLoading(true)
        setPhotoResult(null)
        const start = Date.now()
        try {
            // Same production pipeline (mode-aware resize/quality) the real camera uses.
            const processed = await processPickedImageUri(selectedImage, scanMode)
            const { entry, sources } = await runPhotoAnalysis(processed, userID || 'dev-test', scanMode)
            setPhotoResult({ ms: Date.now() - start, entry, sources })
        } catch (error: any) {
            setPhotoResult({ ms: Date.now() - start, error: error?.message ?? 'Failed' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.note}>Exercises the real NLP + vision flows. Nothing is saved.</Text>

            {/* NLP */}
            <Text style={styles.groupTitle}>NLP — text → macros (raw)</Text>
            <Field label="Quick tests">
                <Segmented options={TEXT_PRESETS.map((p) => ({ label: p, value: p }))} value={question} onChange={setQuestion} />
            </Field>
            <TextInput style={styles.input} placeholder="Food(s)…" placeholderTextColor={colors.placeholder} value={question} onChangeText={setQuestion} multiline />
            <TouchableOpacity style={styles.runButton} onPress={handleTextTest} disabled={loading} activeOpacity={0.7}>
                <Text style={styles.runButtonText}>Run NLP Test</Text>
            </TouchableOpacity>
            {textResult && !loading && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultMeta}>{textResult.ms} ms</Text>
                    {textResult.error ?
                        <Text style={styles.errorText}>{textResult.error}</Text>
                    :   <>
                            {textResult.allZero && <Text style={styles.warnText}>All-zero response — the edge function is likely NOT redeployed (old prompt).</Text>}
                            <Text style={styles.resultText}>
                                {textResult.macros ?
                                    `${textResult.macros.calories} kcal · P ${textResult.macros.protein}g · C ${textResult.macros.carbs}g · F ${textResult.macros.fats}g`
                                :   'Could not parse macros from response'}
                            </Text>
                            <Text style={styles.rawLabel}>raw response</Text>
                            <Text style={styles.rawText} selectable>{textResult.raw}</Text>
                        </>
                    }
                </View>
            )}

            {/* Vision */}
            <Text style={[styles.groupTitle, { marginTop: 28 }]}>Vision — photo</Text>
            <Field label="Sample images">
                {SAMPLES.map((s) => (
                    <TouchableOpacity key={s.label} style={styles.sampleChip} onPress={() => loadSample(s)} activeOpacity={0.6}>
                        <Text style={styles.pickButtonText}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </Field>
            <Field label="Mode">
                <Segmented<ScanMode> options={[{ label: 'Meal', value: 'meal' }, { label: 'Label', value: 'label' }]} value={scanMode} onChange={setScanMode} />
            </Field>
            <View style={styles.pickRow}>
                <TouchableOpacity style={styles.pickButton} onPress={pickImage} activeOpacity={0.6}>
                    <Text style={styles.pickButtonText}>Pick Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickButton} onPress={takePhoto} activeOpacity={0.6}>
                    <Text style={styles.pickButtonText}>Camera</Text>
                </TouchableOpacity>
            </View>
            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.preview} resizeMode="cover" />}
            <TouchableOpacity style={[styles.runButton, !selectedImage && styles.runButtonDisabled]} onPress={handleVisionTest} disabled={loading || !selectedImage} activeOpacity={0.7}>
                <Text style={styles.runButtonText}>Run Vision Test ({scanMode})</Text>
            </TouchableOpacity>
            {photoResult && !loading && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultMeta}>{photoResult.ms} ms</Text>
                    {photoResult.error ?
                        <Text style={styles.errorText}>{photoResult.error}</Text>
                    :   <>
                            <Text style={styles.resultTitle}>{photoResult.entry?.name}</Text>
                            <Text style={styles.resultText}>
                                Total: {photoResult.entry?.calories} kcal · P {photoResult.entry?.protein}g · C {photoResult.entry?.carbs}g · F {photoResult.entry?.fats}g
                            </Text>
                            {photoResult.entry?.ingredients.map((ing, i) => (
                                <View key={i} style={styles.ingredientRow}>
                                    <Text style={styles.ingredientName} numberOfLines={1}>
                                        {ing.quantity}× {ing.name}
                                        {ing.brand ? ` (${ing.brand})` : ''}
                                    </Text>
                                    <Text style={styles.ingredientMacros}>{ing.calories}kcal · P{ing.protein} C{ing.carbs} F{ing.fats}</Text>
                                    <Text style={styles.sourceTag}>{sourceFor(photoResult.sources, ing)}</Text>
                                </View>
                            ))}
                        </>
                    }
                </View>
            )}

            {loading && <ActivityIndicator size="large" color={colors.nutrition} style={styles.spinner} />}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        note: { fontFamily: fonts.regular, fontSize: 13, color: colors.labelMuted, marginBottom: 16 },
        groupTitle: { fontFamily: fonts.semibold, fontSize: 12, color: colors.labelMuted, marginBottom: 8, marginLeft: 2 },
        input: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: colors.text,
            minHeight: 52,
            textAlignVertical: 'top',
            fontFamily: fonts.regular,
            marginBottom: 10,
        },
        runButton: {
            backgroundColor: colors.nutrition,
            borderRadius: radius.card,
            paddingVertical: 13,
            alignItems: 'center',
            justifyContent: 'center',
        },
        runButtonDisabled: { opacity: 0.4 },
        runButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
        pickRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
        pickButton: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        pickButtonText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.nutrition },
        sampleChip: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        preview: { width: '100%', height: 180, borderRadius: radius.card, marginBottom: 10, backgroundColor: colors.surface },
        spinner: { marginTop: 20 },
        resultBox: {
            marginTop: 12,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        resultMeta: { fontFamily: fonts.medium, fontSize: 11, color: colors.labelMuted, marginBottom: 6 },
        resultTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 4 },
        resultText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
        errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.warning },
        warnText: { fontFamily: fonts.medium, fontSize: 12, color: colors.warning, marginBottom: 6 },
        rawLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.labelMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 2 },
        rawText: { fontFamily: 'monospace', fontSize: 11, color: colors.textSecondary },
        ingredientRow: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
        ingredientName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
        ingredientMacros: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        sourceTag: { fontFamily: fonts.medium, fontSize: 11, color: colors.nutrition, marginTop: 2 },
    })
}
