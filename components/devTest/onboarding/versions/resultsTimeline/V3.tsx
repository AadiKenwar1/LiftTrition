import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Results Timeline — green accent. Inert. */
const MILESTONES = [
    { week: 'Week 1', title: 'Energy up, habits forming', highlight: false },
    { week: 'Week 2', title: 'First visible changes', highlight: true },
    { week: 'Week 4', title: 'Noticeable progress', highlight: false },
    { week: 'Week 8', title: 'On track to your goal', highlight: false },
]

export default function ResultsTimelineV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const accent = colors.text

    return (
        <V3Screen step={8} eyebrow="Step 9 of 12" title="You'll see results fast" subtitle="Stick with your plan and here's what to expect — most people notice changes by week 2." accent={accent} onBack={() => router.back()} onNext={() => {}} nextLabel="Continue">
            <View style={styles.timeline}>
                {MILESTONES.map((m, i) => (
                    <Animated.View key={m.week} entering={FadeInDown.delay(i * 70).duration(300)} style={styles.row}>
                        <View style={styles.rail}>
                            <View style={[styles.node, { borderColor: accent }, m.highlight && { backgroundColor: accent }]} />
                            {i < MILESTONES.length - 1 && <View style={[styles.line, { backgroundColor: colors.hairline }]} />}
                        </View>
                        <View style={[styles.card, m.highlight && { borderColor: accent, backgroundColor: accent + '10' }]}>
                            <Text style={[styles.week, { color: accent }]}>{m.week}</Text>
                            <Text style={styles.cardTitle}>{m.title}</Text>
                            {m.highlight && <Text style={styles.badge}>You're here in 14 days</Text>}
                        </View>
                    </Animated.View>
                ))}
            </View>
        </V3Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        timeline: { gap: 0 },
        row: { flexDirection: 'row', gap: 14 },
        rail: { alignItems: 'center', width: 20 },
        node: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, backgroundColor: colors.surface, marginTop: 6 },
        line: { width: 2, flex: 1, marginVertical: 4 },
        card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, gap: 3 },
        week: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
        cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, letterSpacing: -0.3 },
        badge: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    })
}
