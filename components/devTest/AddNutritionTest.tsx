import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

type VariantItem = { key: string; label: string; description: string }

const GROUPS: { title: string; items: VariantItem[] }[] = [
    {
        title: 'Base layouts — opens as a real modal',
        items: [
            { key: 'lean', label: '1 · Lean form', description: 'Current layout minus the ceremony — name first, calorie hero row + P/C/F cells, pinned CTA' },
            { key: 'grid', label: '2 · Macro grid', description: '2×2 tiles with big numerals, inline AI sparkle in the name field, live kcal arithmetic check' },
            { key: 'ai', label: '3 · AI-first', description: '“What did you eat?” hero, gradient Generate as primary, manual entry demoted below a divider' },
        ],
    },
    {
        title: 'AI-first variations',
        items: [
            { key: 'aiReveal', label: '3a · Staged reveal', description: 'Opens with just describe + Generate; macro fields appear as a review step after AI (or via a manual link), with a Regenerate pill' },
            { key: 'aiComposer', label: '3b · Composer', description: 'Chat-style describe field with the sparkle send button inside it — no separate Generate row or divider' },
            { key: 'aiCard', label: '3c · Result card', description: 'Generate reveals an editable replica of the Entry card exactly as it will appear in the day view' },
        ],
    },
    {
        title: 'AI-first — manual entry treatments',
        items: [
            { key: 'aiLedger', label: '4a · Ledger card', description: 'Manual fields as one receipt-style card — a row per macro, right-aligned numbers, hairline dividers, focused row tints green' },
            { key: 'aiInset', label: '4b · Inset panel', description: 'Calorie hero row + P/C/F cells grouped inside a single inset panel so the section reads as one quiet unit' },
            { key: 'aiCollapse', label: '4c · Collapsible', description: '“Enter manually” is a folded-away card row that expands inline; Generate auto-expands and fills it — no divider' },
        ],
    },
]

export default function AddNutritionTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [tier, setTier] = useState<'free' | 'premium'>('premium')

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented
                    value={isDark ? 'dark' : 'light'}
                    onChange={(v) => setColorScheme(v as 'light' | 'dark')}
                    options={[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                    ]}
                />
            </Field>
            <Field label="Tier">
                <Segmented
                    value={tier}
                    onChange={setTier}
                    options={[
                        { label: 'Free', value: 'free' },
                        { label: 'Premium', value: 'premium' },
                    ]}
                />
            </Field>

            {GROUPS.map((group) => (
                <View key={group.title}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    {group.items.map((v) => (
                        <TouchableOpacity key={v.key} style={styles.row} activeOpacity={0.6} onPress={() => router.push(`/devTest/addNutritionVariant?variant=${v.key}&tier=${tier}` as never)}>
                            <View style={styles.rowText}>
                                <Text style={styles.rowLabel}>{v.label}</Text>
                                <Text style={styles.rowDescription}>{v.description}</Text>
                            </View>
                            <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                        </TouchableOpacity>
                    ))}
                </View>
            ))}
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
        groupTitle: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 8,
            marginBottom: 8,
            marginLeft: 2,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 8,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        rowText: {
            flex: 1,
        },
        rowLabel: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
            marginBottom: 2,
        },
        rowDescription: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.textMuted,
            lineHeight: 16,
        },
    })
}
