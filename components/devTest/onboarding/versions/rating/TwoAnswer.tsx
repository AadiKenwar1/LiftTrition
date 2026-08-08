import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'
import V4Screen from '../_shared/V4Screen'
import { useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Two-answer priming — the soft-ask, built the only way it can pass review, and kept
 * here mainly so the team can look at the pattern and reject it knowingly.
 *
 * The familiar version of this screen asks "Enjoying the app?" and sends only the yes to the store. That is
 * review gating: Apple's guidelines prohibit steering only happy users toward a review, and the FTC has
 * called the practice deceptive. This version removes the gate — BOTH answers open the same sheet, and the
 * answer is recorded for the team rather than used to decide who gets to rate. That is the construction the
 * research says can survive iOS review.
 *
 * It still should not ship on Android: Google's In-App Review API rules forbid asking the user any opinion
 * question before or while presenting the prompt, "Do you like the app?" included, with no equal-paths
 * exception. So this is an iOS-only candidate at best, and the flow currently plays the plain star row
 * instead. If it is ever picked up, the answer must stay telemetry — the moment it changes who reaches the
 * sheet, it is gating again.
 */
const ANSWERS = [
    { id: 'good', label: 'Looking good' },
    { id: 'unsure', label: 'Not sure yet' },
]

export default function RatingTwoAnswer() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { prompted, rate, advance } = useRatingBeat()

    // Both answers do the same thing. The id would be telemetry only — it must never pick who reaches the sheet.
    const answer = (_id: string) => void rate()

    const footer = (
        <TouchableOpacity style={styles.laterButton} onPress={advance} activeOpacity={0.8}>
            <Text style={styles.laterText}>{prompted ? 'Continue' : 'Skip'}</Text>
        </TouchableOpacity>
    )

    return (
        <V4Screen eyebrow="One quick thing" title="How's the plan looking?" subtitle="Either way, you can leave a rating." accent={colors.text} footer={footer} contentStyle={styles.center}>
            <View style={styles.answers}>
                {ANSWERS.map((a, i) => (
                    <Animated.View key={a.id} entering={reduced ? undefined : FadeInDown.delay(i * 80).duration(300)}>
                        <TouchableOpacity style={styles.answerCard} onPress={() => answer(a.id)} activeOpacity={0.7}>
                            <Text style={styles.answerText}>{a.label}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        answers: { gap: 12, paddingVertical: 12 },
        answerCard: { height: 62, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        answerText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
    })
}
