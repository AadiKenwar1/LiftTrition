import StepProgress from '@/components/NeutralComponents/StepProgress'
import { fonts, radius, spacing, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Production onboarding scaffold (port of the V4 dev `V4Screen`): neutral canvas, StepProgress dots +
 * "Step N of M" eyebrow, big title/subtitle, and a footer (Back + neutral primary CTA). The onboarding
 * routes are headerless, so this owns the safe-area top pad. `step` is 0-based; omit it (and `total`) on
 * screens without progress. `onBeforeNext` runs on Next — return false (after an Alert) to stay put.
 * `onSignOut` is presentation-only (no auth import here) — when provided it renders a right-aligned
 * "Sign out" row above the StepProgress dots/eyebrow; omitted by default so every other call site is unchanged.
 */
export interface OnboardingScaffoldProps {
    step?: number
    total?: number
    accent?: string
    title: string
    subtitle?: string
    children?: ReactNode
    contentStyle?: StyleProp<ViewStyle>
    onBack?: () => void
    onNext: () => void
    nextLabel?: string
    nextDisabled?: boolean
    onBeforeNext?: () => boolean
    footer?: ReactNode
    onSignOut?: () => void
}

export default function OnboardingScaffold({ step, total = 9, accent, title, subtitle, children, contentStyle, onBack, onNext, nextLabel = 'Next', nextDisabled = false, onBeforeNext, footer, onSignOut }: OnboardingScaffoldProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const topPad = Math.max(insets.top, 12) + 16

    const handleNext = () => {
        if (onBeforeNext != null && !onBeforeNext()) return
        onNext()
    }

    return (
        <View style={styles.container}>
            <KeyboardAwareScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: topPad }, contentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bottomOffset={24}>
                {onSignOut != null && (
                    <View style={styles.signOutRow}>
                        <TouchableOpacity style={styles.signOutButton} onPress={onSignOut} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Sign out">
                            <Text style={styles.signOutText}>Sign out</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {step != null && <StepProgress current={step} total={total} accent={accent ?? colors.text} />}
                {step != null && <Text style={styles.eyebrow}>Step {step + 1} of {total}</Text>}
                <Text style={styles.title}>{title}</Text>
                {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
                {children}
            </KeyboardAwareScrollView>

            {footer != null ?
                <View style={styles.footer}>{footer}</View>
            :   <View style={styles.footer}>
                    {onBack != null && (
                        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.nextButton, nextDisabled && { backgroundColor: colors.disabled }]} onPress={handleNext} disabled={nextDisabled} activeOpacity={0.85}>
                        <Text style={styles.nextText}>{nextLabel}</Text>
                    </TouchableOpacity>
                </View>
            }
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        scroll: { flex: 1 },
        content: { paddingBottom: 16 },
        signOutRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.cardGap },
        signOutButton: { paddingVertical: 8, paddingHorizontal: spacing.cardGap },
        signOutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSecondary, letterSpacing: -0.2 },
        eyebrow: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textMuted, marginBottom: 8 },
        title: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, minHeight: 58, paddingVertical: 12, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        nextButton: { flex: 1, minHeight: 58, paddingVertical: 12, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
