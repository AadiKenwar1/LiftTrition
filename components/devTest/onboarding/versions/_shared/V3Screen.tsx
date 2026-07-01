import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useOnboardingFlow } from './flowContext'
import StepProgress from './StepProgress'
import { useScreenTopPad } from './useScreenTopPad'

/**
 * Dev-only shared scaffold for the Version 3 (black & white) onboarding redesign. Every V3 screen uses
 * this so they share the exact chrome — neutral B&W canvas, NO full-screen gradient wash, NO icon-in-circle,
 * a big typographic title, a consistent footer, and a single neutral high-contrast CTA. Accent (green or
 * blue) is restrained to small semantic elements only (progress dot, eyebrow, selected states). The body
 * is whatever each screen passes as `children`.
 */
export interface V3ScreenProps {
    /** 0-based flow position; omit to hide the progress bar. */
    step?: number
    totalSteps?: number
    accent?: string
    eyebrow?: string
    title: string
    subtitle?: string
    children?: ReactNode
    contentStyle?: StyleProp<ViewStyle>
    /** Standard footer: a Back (if onBack) + a neutral CTA (if onNext). */
    onBack?: () => void
    onNext?: () => void
    nextLabel?: string
    /** Replace the standard footer entirely (e.g. paywall). Takes precedence over onBack/onNext. */
    footer?: ReactNode
}

export default function V3Screen({ step, totalSteps = 12, accent, eyebrow, title, subtitle, children, contentStyle, onBack, onNext, nextLabel = 'Next', footer }: V3ScreenProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad()
    const flow = useOnboardingFlow()

    // In a flow walkthrough the footer drives the runner; standalone it uses the passed handlers.
    const handleBack = flow ? flow.goBack : onBack
    const handleNext = flow ? flow.goNext : onNext
    const showBack = flow ? flow.index > 0 : onBack != null
    const showStdFooter = footer == null && (flow != null || onNext != null)

    return (
        <View style={styles.container}>
            <KeyboardAwareScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: topPad }, contentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bottomOffset={24}>
                {step != null && <StepProgress current={step} total={totalSteps} accent={accent} />}
                {eyebrow != null && <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{eyebrow}</Text>}
                <Text style={styles.title}>{title}</Text>
                {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
                {children}
            </KeyboardAwareScrollView>

            {footer != null ?
                <View style={styles.footer}>{footer}</View>
            : showStdFooter ?
                <View style={styles.footer}>
                    {showBack && (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                        <Text style={styles.nextText}>{nextLabel}</Text>
                    </TouchableOpacity>
                </View>
            :   null}
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        scroll: { flex: 1 },
        content: { paddingBottom: 16 },
        eyebrow: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
        title: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        nextButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
