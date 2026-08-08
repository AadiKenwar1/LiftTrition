import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { PAGES } from './onboarding/registry'

/**
 * Dev-only Rating Screen hub — the dedicated "ratingScreen" Dev Hub row. Without `?version` it lists the
 * rating versions; with it, it renders that version full-screen (tap a row to get there, swipe back to
 * return). Versions come from the registry's `rating` entry, so this page and the V6 flow can never drift
 * apart — adding a version there adds it here. The rating row is excluded from the Dev Hub's Onboarding
 * section (see DevHub.tsx) so this hub is its one home.
 */
const RATING = PAGES.find((p) => p.key === 'rating')

export default function RatingScreenTest() {
    const { version } = useLocalSearchParams<{ version?: string }>()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const versions = RATING?.versions ?? []

    // Preview mode — a version index in the URL renders that screen full-screen.
    if (version != null) {
        const idx = Math.min(Math.max(0, Number(version) || 0), Math.max(0, versions.length - 1))
        const Component = versions[idx]?.Component
        return <View style={styles.preview}>{Component ? <Component /> : null}</View>
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Rating Screen</Text>
            <Text style={styles.subtitle}>Asks for an App Store rating — hands off to Apple's sheet</Text>

            {versions.length === 0 ?
                <Text style={styles.empty}>No versions yet — add one in{'\n'}components/devTest/onboarding/versions/rating/</Text>
            :   versions.map((v, vIdx) => (
                    <TouchableOpacity key={v.id} style={styles.row} onPress={() => router.push(`/devTest/ratingScreen?version=${vIdx}` as never)} activeOpacity={0.6}>
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
        preview: {
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
