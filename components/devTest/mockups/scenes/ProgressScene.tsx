import ActivityBanner from '@/components/GraphComponents/ActivityBanner'
import BarChart from '@/components/GraphComponents/BarChart'
import Graph1 from '@/components/GraphComponents/Graph1'
import GraphStats from '@/components/GraphComponents/GraphStats'
import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { ChevronDown, ChevronLeft, ChevronRight, Pencil } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Field, Segmented } from '../../DevControls'
import MockupShell from '../MockupShell'
import { BAR_HIGHLIGHT_INDEX, BODYWEIGHT_TREND, BW_GOAL, CALORIE_GOAL, CALORIES_WEEK, NUTRITION_STREAK, SETS_WEEK, STRENGTH_TREND, TRAINED_DAYS } from '../mockData'

/**
 * App Store mockup: the progress screen with idealized data, recomposed from the real
 * chart primitives (layout mirrors app/(tabs)/progress.tsx; chrome like pickers and
 * week paging is rendered static since the data is canned).
 *
 * Unlike the shipped screen this one never scrolls: the cards drop the fixed 400pt height
 * and flex to fill the viewport, and the card chrome is a couple of points tighter, so a
 * screenshot captures the banner and both graphs whole. The graph components themselves
 * are untouched — they already flex to whatever height their container gives them.
 */
export default function ProgressScene({ initialLift }: { initialLift: boolean }) {
    const [mode, setMode] = useState(initialLift)
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const insets = useSafeAreaInsets()
    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
    const accent = mode ? colors.workout : colors.nutrition

    const topData = mode ? STRENGTH_TREND : BODYWEIGHT_TREND
    const topRange = mode ? 14 : 90
    const topGoal = mode ? undefined : BW_GOAL
    const topFormat = mode ? (n: number) => `${Math.round(n)}` : (n: number) => n.toFixed(1)
    const topTitle = mode ? 'Barbell Bench Press' : 'Body Weight'
    const topSubtitle = mode ? 'Estimated 1 rep max' : `Goal ${BW_GOAL} lb`

    const bottomData = mode ? SETS_WEEK : CALORIES_WEEK
    const bottomGoal = mode ? undefined : CALORIE_GOAL
    const bottomFormat = (n: number) => Math.round(n).toLocaleString()
    const bottomTitle = mode ? 'Sets' : 'Calories'
    const bottomSubtitle = mode ? 'Total per day' : 'Daily intake'

    const ranges: { chip: string; selected?: string }[] = mode ? [{ chip: '7' }, { chip: '14', selected: '14 Lifts' }, { chip: '21' }] : [{ chip: '1M' }, { chip: '3M', selected: '3M' }, { chip: '6M' }, { chip: '1Y' }]

    const controls = (
        <Field label="Mode">
            <Segmented
                value={mode ? 'lift' : 'nutrition'}
                onChange={(v) => setMode(v === 'lift')}
                options={[
                    { label: 'Workout', value: 'lift' },
                    { label: 'Nutrition', value: 'nutrition' },
                ]}
            />
        </Field>
    )

    return (
        <MockupShell padTop controls={controls}>
            {/* The bottom card already carries a 10pt margin, so only the remainder of the
                home-indicator inset is added below it. */}
            <View style={[styles.container, { paddingBottom: Math.max(insets.bottom - 10, 2) }]}>
                <ActivityBanner mode={mode} trainedDays={TRAINED_DAYS} nutritionStreak={NUTRITION_STREAK} />

                <View style={styles.graphCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.titleRow}>
                                <Text style={styles.cardTitle} numberOfLines={1}>
                                    {topTitle}
                                </Text>
                                {mode && <ChevronDown size={18} color={accent} strokeWidth={2.5} />}
                            </View>
                            <Text style={styles.cardSubtitle}>{topSubtitle}</Text>
                        </View>
                        {!mode && (
                            <View style={styles.updateBtn}>
                                <Pencil size={14} color={colors.nutrition} strokeWidth={2.5} />
                                <Text style={styles.updateBtnText}>Update</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.rangeStrip}>
                        {ranges.map(({ chip, selected }) => (
                            <View key={chip} style={[styles.rangeChip, selected ? { backgroundColor: accent } : { backgroundColor: colors.surfaceInset, borderColor: colors.hairline, borderWidth: StyleSheet.hairlineWidth }]}>
                                <Text style={[styles.rangeChipText, { color: selected ? '#fff' : colors.textSecondary }]}>{selected ?? chip}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.chartContainer}>
                        <Graph1 key={`top-${mode}-${isDark}`} mode={mode} data={topData} selectedRange={topRange} goal={topGoal} formatValue={topFormat} />
                    </View>
                    <GraphStats graphType={mode ? 'orm' : 'bodyweight'} data={topData} statsData={topData} unitSystem="imperial" mode={mode} goalWeight={BW_GOAL} />
                </View>

                <View style={styles.graphCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.titleRow}>
                                <Text style={styles.cardTitle} numberOfLines={1}>
                                    {bottomTitle}
                                </Text>
                                {!mode && <ChevronDown size={18} color={accent} strokeWidth={2.5} />}
                            </View>
                            <Text style={styles.cardSubtitle}>{bottomSubtitle}</Text>
                        </View>
                    </View>
                    <View style={styles.weekStepper}>
                        <View style={styles.weekStepperArrow}>
                            <ChevronLeft size={22} color={accent} strokeWidth={2.5} />
                        </View>
                        <Text style={styles.weekStepperLabel} numberOfLines={1}>
                            This week
                        </Text>
                        <View style={styles.weekStepperArrow}>
                            <ChevronRight size={22} color={accent} strokeWidth={2.5} style={{ opacity: 0.7 }} />
                        </View>
                    </View>
                    <View style={styles.chartContainer}>
                        <BarChart key={`bottom-${mode}-${isDark}`} mode={mode} data={bottomData} goal={bottomGoal} formatValue={bottomFormat} showXLabels highlightIndex={BAR_HIGHLIGHT_INDEX} />
                    </View>
                    <GraphStats graphType={mode ? 'sets' : 'calories'} data={bottomData} unitSystem="imperial" mode={mode} goal={bottomGoal} />
                </View>
            </View>
        </MockupShell>
    )
}

function makeStyles(colors: Colors, isDark: boolean) {
    return StyleSheet.create({
        // Non-scrolling: the banner takes its natural height and the two cards split
        // what's left, so the whole screen is always fully visible in a screenshot.
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: 8,
            paddingHorizontal: 15,
            width: '100%',
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 4,
        },
        headerLeft: {
            flex: 1,
            minWidth: 0,
        },
        rangeStrip: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 2,
            marginBottom: 2,
        },
        rangeChip: {
            paddingVertical: 5,
            paddingHorizontal: 14,
            borderRadius: radius.chip,
        },
        rangeChipText: {
            fontSize: 12.5,
            letterSpacing: -0.2,
            fontFamily: fonts.semibold,
        },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            maxWidth: '100%',
        },
        cardTitle: {
            fontSize: 18,
            color: colors.text,
            letterSpacing: -0.4,
            fontFamily: fonts.extrabold,
            flexShrink: 1,
        },
        cardSubtitle: {
            fontSize: 12.5,
            color: colors.textSecondary,
            marginTop: 1,
            fontFamily: fonts.medium,
        },
        updateBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: colors.nutrition + '22',
            borderRadius: radius.chip,
            paddingHorizontal: 10,
            paddingVertical: 5,
        },
        updateBtnText: {
            fontSize: 12.5,
            color: colors.nutrition,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        // No fixed height (the shipped screen's 400) — each card claims an equal share of
        // the leftover space, which is what keeps both charts on one screen.
        graphCard: {
            width: '100%',
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            marginBottom: 10,
            padding: 13,
            alignSelf: 'stretch',
            ...(isDark ?
                {}
            :   {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                }),
        },
        chartContainer: {
            flex: 1,
        },
        weekStepper: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 2,
            marginBottom: 4,
        },
        weekStepperArrow: {
            padding: 2,
        },
        weekStepperLabel: {
            textAlign: 'center',
            fontSize: 13.5,
            color: colors.text,
            letterSpacing: -0.2,
            fontFamily: fonts.semibold,
        },
    })
}
