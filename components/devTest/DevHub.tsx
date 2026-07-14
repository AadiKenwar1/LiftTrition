import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { PAGES as ONBOARDING_PAGES } from './onboarding/registry'

/**
 * Dev-only hub: a menu of buttons that open isolated test pages for charts / popups / components.
 * Add a test = drop a `<X>Test.tsx` in components/devTest, add a `app/devTest/<x>.tsx` stub route,
 * and add one entry to GROUPS below.
 */
const GROUPS: { title: string; items: { label: string; route: string }[] }[] = [
    {
        title: 'Charts',
        items: [
            { label: 'Line Chart', route: '/devTest/lineChart' },
            { label: 'Bar Chart', route: '/devTest/barChart' },
        ],
    },
    {
        title: 'Nutrition AI',
        items: [{ label: 'AI (NLP + Vision)', route: '/devTest/aiTest' }],
    },
    {
        title: 'Components',
        items: [
            { label: 'Activity Banner', route: '/devTest/activityBanner' },
            { label: 'App Loading Screen', route: '/devTest/loadingScreen' },
            { label: 'Spinner Lab', route: '/devTest/spinnerLab' },
            { label: 'Suggest Set', route: '/devTest/suggestSet' },
            { label: 'Calendar', route: '/devTest/calendar' },
            { label: 'Add Nutrition Modal', route: '/devTest/addNutrition' },
            { label: 'Color Hue Review', route: '/devTest/colorHue' },
        ],
    },
    {
        title: 'Mockups (App Store)',
        items: [
            { label: 'Dual Mode — Frame 1', route: '/devTest/mockup?scene=dualMode' },
            { label: 'Progress — Workout', route: '/devTest/mockup?scene=progress&mode=lift' },
            { label: 'Progress — Nutrition', route: '/devTest/mockup?scene=progress&mode=nutrition' },
        ],
    },
    {
        title: 'Onboarding',
        items: [
            { label: '▶  Walk the V4 flow', route: '/devTest/onboardingFlow?version=v4' },
            { label: '▶  Walk the V3 flow', route: '/devTest/onboardingFlow?version=v3' },
            ...ONBOARDING_PAGES.map((p, i) => ({ label: p.label, route: `/devTest/onboardingPage?page=${i}` })),
        ],
    },
]

export default function DevHub() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <TouchableOpacity style={styles.row} onPress={() => setColorScheme(isDark ? 'light' : 'dark')} activeOpacity={0.6}>
                <Text style={styles.rowLabel}>Theme</Text>
                <Text style={styles.rowValue}>{isDark ? 'Dark' : 'Light'}</Text>
            </TouchableOpacity>

            {GROUPS.map((group) => (
                <View key={group.title} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    {group.items.map((item) => (
                        <TouchableOpacity key={item.route} style={styles.row} onPress={() => router.push(item.route as never)} activeOpacity={0.6}>
                            <Text style={styles.rowLabel}>{item.label}</Text>
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
        group: {
            marginTop: 20,
        },
        groupTitle: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 8,
            marginLeft: 2,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 8,
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
    })
}
