import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { PAGES } from './registry'

/**
 * Dev-only "versions" sub-page: lists every version of one onboarding page (from the registry).
 * Reached via `/devTest/onboardingPage?page=N`. Tapping a version opens its full-screen preview.
 */
export default function OnboardingVersionsList() {
    const { page } = useLocalSearchParams<{ page?: string }>()
    const idx = Math.min(Math.max(0, Number(page) || 0), PAGES.length - 1)
    const pageDef = PAGES[idx]
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{pageDef.label}</Text>
            <Text style={styles.subtitle}>{pageDef.screen}</Text>

            {pageDef.versions.length === 0 ?
                <Text style={styles.empty}>No versions yet — add one in{'\n'}components/devTest/onboarding/versions/{pageDef.key}/</Text>
            :   pageDef.versions.map((v, vIdx) => (
                    <TouchableOpacity key={v.id} style={styles.row} onPress={() => router.push(`/devTest/onboardingPreview?page=${idx}&version=${vIdx}` as never)} activeOpacity={0.6}>
                        <Text style={styles.rowLabel}>{v.label}</Text>
                        <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                    </TouchableOpacity>
                ))
            }
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
        title: {
            fontFamily: fonts.bold,
            fontSize: 22,
            color: colors.text,
            letterSpacing: -0.5,
            marginLeft: 2,
        },
        subtitle: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.labelMuted,
            marginLeft: 2,
            marginBottom: 16,
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
        empty: {
            fontFamily: fonts.regular,
            fontSize: 14,
            color: colors.textMuted,
            marginTop: 8,
            marginLeft: 2,
            lineHeight: 20,
        },
    })
}
