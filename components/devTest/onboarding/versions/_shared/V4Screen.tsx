import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useOnboardingFlow } from './flowContext'
import StepProgress from './StepProgress'
import { useScreenTopPad } from './useScreenTopPad'

/**
 * Dev-only shared scaffold for the Version 4 (neutral + hero color) onboarding redesign. Same chrome as
 * V3Screen (neutral canvas, big typographic title, single high-contrast CTA), with the numbering fix baked
 * in: inside a flow the "Step N of M" eyebrow AND the progress dots come from the runner's computation
 * (flow.stepNumber / flow.stepTotal), so they're contiguous and skip-aware. Standalone (per-page preview) it
 * falls back to the `step` / `totalSteps` props so isolated previews still render. `accent` stays neutral
 * (colors.text) on every screen — color lives only in the three hero beats inside specific screens.
 */
export interface V4ScreenProps {
    /** 0-based fallback flow position for STANDALONE previews; omit to hide the progress bar. In a flow the runner's numbering wins. */
    step?: number
    totalSteps?: number
    accent?: string
    /** Fallback eyebrow for standalone / non-numbered screens. In a flow a numbered screen shows "Step N of M" instead. */
    eyebrow?: string
    title: string
    subtitle?: string
    children?: ReactNode
    contentStyle?: StyleProp<ViewStyle>
    /** Standard footer: a Back (if onBack) + a neutral CTA (if onNext). */
    onBack?: () => void
    onNext?: () => void
    nextLabel?: string
    /** Grays out + disables Next until the screen's required input exists (matches the renameModal/logsModal pattern). */
    nextDisabled?: boolean
    /** Semantic validation on Next (production validator pattern: Alert + return false to stay on the screen). */
    onBeforeNext?: () => boolean
    /** Replace the standard footer entirely (e.g. paywall). Takes precedence over onBack/onNext. */
    footer?: ReactNode
}

export default function V4Screen({ step, totalSteps = 12, accent, eyebrow, title, subtitle, children, contentStyle, onBack, onNext, nextLabel = 'Next', nextDisabled = false, onBeforeNext, footer }: V4ScreenProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad()
    const flow = useOnboardingFlow()

    // In a flow walkthrough the footer drives the runner; standalone it uses the passed handlers.
    const handleBack = flow ? flow.goBack : onBack
    const advance = flow ? flow.goNext : onNext
    const handleNext = () => {
        if (onBeforeNext != null && !onBeforeNext()) return
        advance?.()
    }
    const showBack = flow ? flow.index > 0 : onBack != null
    const showStdFooter = footer == null && (flow != null || onNext != null)

    // Numbering: prefer the runner's contiguous, skip-aware step number; fall back to the standalone props.
    const numbered = flow != null && flow.stepNumber != null
    const progressCurrent = numbered ? (flow!.stepNumber as number) - 1 : step
    const progressTotal = numbered ? (flow!.stepTotal ?? totalSteps) : totalSteps
    const eyebrowText = numbered ? `Step ${flow!.stepNumber} of ${flow!.stepTotal}` : eyebrow

    return (
        <View style={styles.container}>
            <KeyboardAwareScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: topPad }, contentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bottomOffset={24}>
                {progressCurrent != null && <StepProgress current={progressCurrent} total={progressTotal} accent={accent} />}
                {eyebrowText != null && <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{eyebrowText}</Text>}
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
                    <TouchableOpacity style={[styles.nextButton, nextDisabled && { backgroundColor: colors.disabled }]} onPress={handleNext} disabled={nextDisabled} activeOpacity={0.85}>
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
