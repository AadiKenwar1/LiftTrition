import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { STEPS as ONBOARDING_STEPS } from './onboarding/registry'

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
        items: [{ label: 'Activity Banner', route: '/devTest/activityBanner' }],
    },
    {
        title: 'Onboarding',
        items: ONBOARDING_STEPS.map((_, i) => ({ label: `Onboarding ${i + 1}`, route: `/devTest/onboarding?step=${i}` })),
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
