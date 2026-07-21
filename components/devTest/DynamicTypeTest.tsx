import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import Log from '@/components/WorkoutComponents/Log'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Calendar } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// No-op handler for preview rows that don't need a real callback.
const NOOP = () => {}

/**
 * M29 (Dynamic Type clipping) preview. Renders the real Log row (both size variants) and the
 * real OnboardingScaffold footer — the two components whose fixed heights were switched to
 * minHeight — plus a paywall footer/cta mockup and a logsModal add/date button row mockup that
 * mirror those files' style values (both are full route screens with hooks/params that can't be
 * embedded directly). Long copy throughout so a reviewer can crank iOS Settings > Accessibility >
 * Display & Text Size > Larger Text (up to AX5) and confirm every grown container fits its text
 * with no clipped glyphs, while the logsModal glyphs stay crisp and capped inside their fixed
 * 50x50 chip. This page itself only toggles theme — font scale is controlled by the OS.
 */
export default function DynamicTypeTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <TouchableOpacity style={styles.row} onPress={() => setColorScheme(isDark ? 'light' : 'dark')} activeOpacity={0.6}>
                <Text style={styles.rowLabel}>Theme</Text>
                <Text style={styles.rowValue}>{isDark ? 'Dark' : 'Light'}</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>Set iOS Settings → Accessibility → Display &amp; Text Size → Larger Text (up to AX5) on-device/simulator, then reopen this page to verify growth.</Text>

            <Text style={styles.sectionTitle}>Log row — default (minHeight 96, workoutScreen.tsx)</Text>
            <Log text="Barbell Bench Press — Close Grip, Paused, Competition Style" subtitle="6 exercises in this routine" showImageFallback onPress={NOOP} onEditPress={NOOP} onMenuPress={NOOP} />

            <Text style={styles.sectionTitle}>Log row — exerciseScreen.tsx variant (wrapperHeight 120, textLines 3)</Text>
            <Log text="Incline Dumbbell Press — Neutral Grip, Slow Eccentric Tempo" subtitle="Chest · Front Delts · Triceps — heavy compound movement" showImageFallback wrapperHeight={120} textLines={3} onPress={NOOP} onEditPress={NOOP} onMenuPress={NOOP} />

            <Text style={styles.sectionTitle}>OnboardingScaffold footer (real component)</Text>
            <View style={styles.scaffoldFrame}>
                <OnboardingScaffold title="How active is your day-to-day?" subtitle="This helps us calibrate your starting targets." onBack={NOOP} onNext={NOOP} nextLabel="Continue to the next step of setup" />
            </View>

            <Text style={styles.sectionTitle}>paywall.tsx footer + cta (mockup — same style values)</Text>
            <View style={styles.paywallMock}>
                <TouchableOpacity style={styles.ctaMock} activeOpacity={0.85}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradientMock}>
                        <Text style={styles.ctaTextMock}>Start Your 3-Day Free Trial Right Now</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <View style={styles.paywallFooterMock}>
                    <TouchableOpacity style={styles.footerButtonMock} activeOpacity={0.8}>
                        <Text style={styles.backTextMock}>Back to plan options</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.footerButtonMock} activeOpacity={0.8}>
                        <Text style={styles.laterTextMock}>Maybe later, I'll decide after trying it out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.sectionTitle}>logsModal add/date button row (mockup — allowFontScaling=false, row is flex-end)</Text>
            <View style={styles.logsRowMock}>
                <View style={styles.spacer} />
                <View style={styles.dateButtonMock}>
                    <Text allowFontScaling={false} style={styles.dateButtonMonthMock}>
                        JUL
                    </Text>
                    <Text allowFontScaling={false} style={styles.dateButtonDayMock}>
                        20
                    </Text>
                </View>
                <View style={styles.dateButtonMock}>
                    <Calendar size={22} color={colors.workout} strokeWidth={2.5} />
                </View>
                <TouchableOpacity style={styles.addButtonTouchableMock} activeOpacity={0.8}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButtonGradientMock}>
                        <Text allowFontScaling={false} style={styles.addButtonTextMock}>
                            +
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
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
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 12,
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
        hint: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.textMuted,
            lineHeight: 17,
            marginBottom: 4,
        },
        sectionTitle: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 20,
            marginBottom: 8,
            marginLeft: 2,
        },
        scaffoldFrame: {
            height: 620,
            borderRadius: radius.cardLg,
            overflow: 'visible',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        paywallMock: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 16,
        },
        ctaMock: {
            minHeight: 58,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            marginBottom: 14,
        },
        ctaGradientMock: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 12,
        },
        ctaTextMock: {
            fontFamily: fonts.semibold,
            fontSize: 17,
            color: '#fff',
            letterSpacing: -0.3,
            textAlign: 'center',
        },
        paywallFooterMock: {
            flexDirection: 'row',
            gap: 12,
        },
        footerButtonMock: {
            flex: 1,
            minHeight: 58,
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderRadius: radius.cardLg,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        backTextMock: {
            fontFamily: fonts.semibold,
            fontSize: 17,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        laterTextMock: {
            fontFamily: fonts.semibold,
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        logsRowMock: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            gap: 8,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 16,
        },
        spacer: {
            flex: 1,
        },
        dateButtonMock: {
            width: 50,
            height: 50,
            borderRadius: 12,
            backgroundColor: colors.surfaceInset,
            borderWidth: 2,
            borderColor: colors.hairline,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dateButtonMonthMock: {
            fontSize: 9,
            color: colors.workout,
            fontFamily: fonts.semibold,
            letterSpacing: 0.5,
        },
        dateButtonDayMock: {
            fontSize: 16,
            color: colors.workout,
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
            marginTop: -2,
        },
        addButtonTouchableMock: {
            width: 50,
            height: 50,
            borderRadius: 12,
            overflow: 'hidden',
        },
        addButtonGradientMock: {
            flex: 1,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        addButtonTextMock: {
            fontSize: 24,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.regular,
        },
    })
}
