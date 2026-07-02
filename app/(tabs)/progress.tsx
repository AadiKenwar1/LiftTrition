import ActivityBanner from '@/components/GraphComponents/ActivityBanner'
import BarChart from '@/components/GraphComponents/BarChart'
import Graph1 from '@/components/GraphComponents/Graph1'
import GraphStats from '@/components/GraphComponents/GraphStats'
import SelectionModal from '@/components/GraphComponents/SelectionModal'
import ModeSwitcher from '@/components/NeutralComponents/ModeSwitcher'
import { useNutrition } from '@/context/NutritionContext'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'

import { addDays, formatDate, getWeekStart } from '@/lib/utils/dateHelper'
import { useRouter } from 'expo-router'
import { ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Pencil, Scale, Utensils } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ProgressScreen() {
    const { mode, settings, handleGetBodyWeightProgressData, bwProgress } = useSettings()
    const { handleGetMacroForWeek, nutritionData, nutritionStreak } = useNutrition()
    const { logs, handleGetOneRepMaxData, handleGetSetsForWeek, lastExercise, fullExerciseLibAsList, trainedDaysThisWeek } = useWorkout()
    const router = useRouter()
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

    // Local state for graph selections — topRange drives the line card; the bar card pages by week.
    const [topRange, setTopRange] = useState<7 | 14 | 21>(7)
    const [bottomWeekOffset, setBottomWeekOffset] = useState(0)
    const [selectedExercise, setSelectedExercise] = useState<string>(lastExercise || 'Barbell Bench Press')
    const [selectedMacro, setSelectedMacro] = useState<'calories' | 'protein' | 'carbs' | 'fats'>('calories')

    // Modal visibility state
    const [selectionModalVisible, setSelectionModalVisible] = useState(false)

    // Set selected exercise to last exercise if it exists
    useEffect(() => {
        if (lastExercise) {
            setSelectedExercise(lastExercise)
        }
    }, [lastExercise])

    // Reset the bar card to the current week when switching modes
    useEffect(() => {
        setBottomWeekOffset(0)
    }, [mode])

    // Data for selection modal — exercise picker (lift, top card) or macro picker (nutrition, bottom card)
    const macroList = useMemo(
        () => [
            { id: 'calories', title: 'Calories', subtitle: 'Total caloric intake' },
            { id: 'protein', title: 'Protein', subtitle: 'Protein consumption' },
            { id: 'carbs', title: 'Carbs', subtitle: 'Carbohydrate intake' },
            { id: 'fats', title: 'Fats', subtitle: 'Fat consumption' },
        ],
        [],
    )

    const selectionData = mode ? fullExerciseLibAsList : macroList

    // TOP card (line) — Strength (lift) / Body Weight (nutrition)
    const topRawData = useMemo(() => {
        const rawData = mode === true ? handleGetOneRepMaxData(selectedExercise) : handleGetBodyWeightProgressData(settings.onboardingCompletedAt)
        const startIndex = Math.max(0, rawData.length - topRange)
        return rawData.slice(startIndex)
    }, [mode, selectedExercise, topRange, logs, bwProgress, lastExercise, handleGetOneRepMaxData, handleGetBodyWeightProgressData, settings.onboardingCompletedAt])

    // BOTTOM card (bars) — Sets (lift) / Calories+Macros (nutrition), one calendar week at a time
    const weekStart = useMemo(() => addDays(getWeekStart(new Date()), bottomWeekOffset * 7), [bottomWeekOffset])

    const bottomData = useMemo(() => (mode ? handleGetSetsForWeek(weekStart) : handleGetMacroForWeek(selectedMacro, weekStart)), [mode, selectedMacro, weekStart, logs, nutritionData, handleGetSetsForWeek, handleGetMacroForWeek])
    const bottomHasData = bottomData.some((d) => d.value > 0)

    // Week navigation bounds + label
    const minWeekStart = useMemo(() => (settings.onboardingCompletedAt ? getWeekStart(new Date(settings.onboardingCompletedAt)) : addDays(getWeekStart(new Date()), -52 * 7)), [settings.onboardingCompletedAt])
    const canGoPrev = weekStart.getTime() > minWeekStart.getTime()
    const canGoNext = bottomWeekOffset < 0
    const weekLabel =
        bottomWeekOffset === 0 ? 'This week'
        : bottomWeekOffset === -1 ? 'Last week'
        : `${formatDate(weekStart, false)} – ${formatDate(addDays(weekStart, 6), false)}`

    // Signature for keying the line chart so it re-renders when data changes
    const topSig = `${topRawData.length}:${topRawData.at(-1)?.day ?? ''}:${topRawData.at(-1)?.value ?? ''}`

    const accent = mode ? colors.workout : colors.nutrition

    // Goal + value formatting per card
    const nutritionGoal =
        selectedMacro === 'calories' ? settings.calorieGoal
        : selectedMacro === 'protein' ? settings.proteinGoal
        : selectedMacro === 'carbs' ? settings.carbsGoal
        : settings.fatsGoal

    const topGoal = mode ? undefined : settings.goalWeight
    const topFormat = mode ? (n: number) => `${Math.round(n)}` : (n: number) => n.toFixed(1)

    const bottomGoal = mode ? undefined : nutritionGoal
    const bottomFormat = (n: number) => Math.round(n).toLocaleString()

    // Card headers (title + simple subtitle, shown inside each card)
    const topTitle = mode ? selectedExercise : 'Body Weight'
    const topSubtitle = mode ? 'Estimated 1 rep max' : 'Daily'
    const bottomTitle = mode ? 'Sets' : selectedMacro.charAt(0).toUpperCase() + selectedMacro.slice(1)
    const bottomSubtitle = mode ? 'Total per day' : 'Daily intake'

    const renderEmptyState = (Icon: React.ComponentType<any>, title: string, subtitle: string, onPress?: () => void) => {
        const content = (
            <View style={styles.emptyGraphState}>
                <View style={[styles.emptyIconCircle, { backgroundColor: accent + '1A' }]}>
                    <Icon size={48} color={accent} strokeWidth={2} />
                </View>
                <Text style={styles.emptyGraphText}>{title}</Text>
                <Text style={styles.emptyGraphSubtext}>{subtitle}</Text>
            </View>
        )
        return onPress ?
            <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
                {content}
            </TouchableOpacity>
        :   content
    }

    return (
        <>
            <ModeSwitcher />
            <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
                <ActivityBanner mode={mode} trainedDays={trainedDaysThisWeek} nutritionStreak={nutritionStreak} />

                {/* TOP card — line chart */}
                <View style={styles.graphCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            {mode ?
                                <TouchableOpacity style={styles.titleRow} onPress={() => setSelectionModalVisible(true)} activeOpacity={0.6} hitSlop={8}>
                                    <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                        {topTitle}
                                    </Text>
                                    <ChevronDown size={18} color={accent} strokeWidth={2.5} />
                                </TouchableOpacity>
                            :   <Text style={styles.cardTitle} numberOfLines={1}>
                                    {topTitle}
                                </Text>
                            }
                            <Text style={styles.cardSubtitle}>{topSubtitle}</Text>
                        </View>
                        {!mode && (
                            <TouchableOpacity
                                style={styles.updateBtn}
                                onPress={() => router.push('/nutritionScreens/updateBWModal')}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Update body weight"
                            >
                                <Pencil size={14} color={colors.nutrition} strokeWidth={2.5} />
                                <Text style={styles.updateBtnText}>Update</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {/* Range strip — segmented 7/14/21 above the chart (selected chip carries the unit) */}
                    <View style={styles.rangeStrip}>
                        {([7, 14, 21] as const).map((r) => {
                            const selected = topRange === r
                            return (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.rangeChip, selected ? { backgroundColor: accent } : { backgroundColor: colors.surfaceInset, borderColor: colors.hairline, borderWidth: StyleSheet.hairlineWidth }]}
                                    onPress={() => setTopRange(r)}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Show last ${r} ${mode ? 'lifts' : 'days'}`}
                                >
                                    <Text style={[styles.rangeChipText, { color: selected ? '#fff' : colors.textSecondary }]}>{selected ? `${r} ${mode ? 'Lifts' : 'Days'}` : `${r}`}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                    <View style={styles.chartContainer}>
                        {topRawData.length > 0 ?
                            <Graph1 key={`top-${mode ? 'lift' : 'nutrition'}-${topRange}-${mode ? selectedExercise : 'bw'}-${topSig}`} mode={mode} data={topRawData} selectedRange={topRange} goal={topGoal} formatValue={topFormat} />
                        :   renderEmptyState(mode ? Dumbbell : Scale, mode ? 'No data yet for this exercise' : 'No weight data yet', mode ? 'Start logging workouts to see your progress' : 'Update your body weight to see progress', mode ? undefined : () => router.push('/nutritionScreens/updateBWModal'))}
                    </View>
                    <GraphStats graphType={mode ? 'orm' : 'bodyweight'} data={topRawData} statsData={topRawData} unitSystem={settings.unitSystem} mode={mode} goalWeight={settings.goalWeight} />
                </View>

                {/* BOTTOM card — bar chart (one calendar week at a time) */}
                <View style={styles.graphCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            {!mode ?
                                <TouchableOpacity style={styles.titleRow} onPress={() => setSelectionModalVisible(true)} activeOpacity={0.6} hitSlop={8}>
                                    <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                        {bottomTitle}
                                    </Text>
                                    <ChevronDown size={18} color={accent} strokeWidth={2.5} />
                                </TouchableOpacity>
                            :   <Text style={styles.cardTitle} numberOfLines={1}>
                                    {bottomTitle}
                                </Text>
                            }
                            <Text style={styles.cardSubtitle}>{bottomSubtitle}</Text>
                        </View>
                    </View>
                    {/* Week stepper — label + paging arrows above the chart */}
                    <View style={styles.weekStepper}>
                        <TouchableOpacity onPress={() => setBottomWeekOffset((o) => o - 1)} disabled={!canGoPrev} hitSlop={12} style={styles.weekStepperArrow} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel="Previous week">
                            <ChevronLeft size={22} color={accent} strokeWidth={2.5} style={{ opacity: canGoPrev ? 1 : 0.25 }} />
                        </TouchableOpacity>
                        <Text style={styles.weekStepperLabel} numberOfLines={1}>
                            {weekLabel}
                        </Text>
                        <TouchableOpacity onPress={() => setBottomWeekOffset((o) => Math.min(0, o + 1))} disabled={!canGoNext} hitSlop={12} style={styles.weekStepperArrow} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel="Next week">
                            <ChevronRight size={22} color={accent} strokeWidth={2.5} style={{ opacity: canGoNext ? 1 : 0.7 }} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.chartContainer}>
                        {bottomHasData ?
                            <BarChart key={`bottom-${mode ? 'lift' : 'nutrition'}-${mode ? 'sets' : selectedMacro}`} mode={mode} data={bottomData} goal={bottomGoal} formatValue={bottomFormat} showXLabels highlightIndex={bottomWeekOffset === 0 ? new Date().getDay() : -1} />
                        :   renderEmptyState(mode ? Dumbbell : Utensils, mode ? 'No training this week' : 'Nothing logged this week', mode ? 'Log a workout to see your sets' : `Log meals to see your ${bottomTitle.toLowerCase()}`)}
                    </View>
                    {bottomHasData && <GraphStats graphType={mode ? 'sets' : selectedMacro} data={bottomData} unitSystem={settings.unitSystem} mode={mode} goal={mode ? undefined : nutritionGoal} />}
                </View>
            </ScrollView>

            {/* Modals */}
            <SelectionModal
                visible={selectionModalVisible}
                onClose={() => setSelectionModalVisible(false)}
                onSelect={(value: string) => {
                    if (mode) {
                        setSelectedExercise(value)
                    } else {
                        setSelectedMacro(value.toLowerCase() as 'calories' | 'protein' | 'carbs' | 'fats')
                    }
                }}
                mode={mode}
                data={selectionData}
            />
        </>
    )
}

function makeStyles(colors: Colors, isDark: boolean) {
    return StyleSheet.create({
        scroll: {
            flex: 1,
            backgroundColor: colors.background,
        },
        container: {
            paddingTop: 10,
            paddingBottom: 60,
            paddingHorizontal: 15,
            width: '100%',
        },
        bwContainer: {
            marginBottom: 6,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 8,
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
            marginTop: 6,
            marginBottom: 2,
        },
        rangeChip: {
            paddingVertical: 7,
            paddingHorizontal: 16,
            borderRadius: radius.chip,
        },
        rangeChipText: {
            fontSize: 13,
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
            fontSize: 20,
            color: colors.text,
            letterSpacing: -0.4,
            fontFamily: fonts.extrabold,
            flexShrink: 1,
        },
        cardSubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 2,
            fontFamily: fonts.medium,
        },
        updateBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: colors.nutrition + '22',
            borderRadius: radius.chip,
            paddingHorizontal: 11,
            paddingVertical: 6,
        },
        updateBtnText: {
            fontSize: 13,
            color: colors.nutrition,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        graphCard: {
            width: '100%',
            height: 400,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            marginBottom: 15,
            padding: 15,
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
        emptyGraphState: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyIconCircle: {
            width: 100,
            height: 100,
            borderRadius: 50,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
        },
        emptyGraphText: {
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.4,
            marginBottom: 8,
            fontFamily: fonts.bold,
        },
        emptyGraphSubtext: {
            fontSize: 14,
            color: colors.labelMuted,
            fontFamily: fonts.regular,
        },
        weekStepper: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 10,
        },
        weekStepperArrow: {
            padding: 4,
        },
        weekStepperLabel: {
            textAlign: 'center',
            fontSize: 14,
            color: colors.text,
            letterSpacing: -0.2,
            fontFamily: fonts.semibold,
        },
    })
}
