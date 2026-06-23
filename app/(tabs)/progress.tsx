import ActivityBanner from '@/components/GraphComponents/ActivityBanner'
import BarChart from '@/components/GraphComponents/BarChart'
import Graph1 from '@/components/GraphComponents/Graph1'
import GraphStats from '@/components/GraphComponents/GraphStats'
import RangeSelectionModal from '@/components/GraphComponents/RangeSelectionModal'
import SelectionModal from '@/components/GraphComponents/SelectionModal'
import ModeSwitcher from '@/components/NeutralComponents/ModeSwitcher'
import BwCard from '@/components/NutritionComponents/bwCard'
import { useNutrition } from '@/context/NutritionContext'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'

import { downsampleData, downsampleDataPreserveEndpoints } from '@/lib/utils/downsample'
import { getGraphChartNote } from '@/lib/utils/graphChartNote'
import { ChevronDown, Dumbbell, Scale } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ProgressScreen() {
    const { mode, settings, handleGetBodyWeightProgressData, bwProgress } = useSettings()
    const { handleGetMacroDataForGraph, nutritionData, nutritionStreak } = useNutrition()
    const { logs, handleGetOneRepMaxData, handleGetSetsData, lastExercise, fullExerciseLibAsList, workoutDaysThisWeek } = useWorkout()
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

    // Local state for graph selections — topRange drives the line card, bottomRange the bar card.
    const [topRange, setTopRange] = useState<7 | 14 | 21>(7)
    const [bottomRange, setBottomRange] = useState<7 | 14 | 21>(7)
    const [selectedExercise, setSelectedExercise] = useState<string>(lastExercise || 'Barbell Bench Press')
    const [selectedMacro, setSelectedMacro] = useState<'calories' | 'protein' | 'carbs' | 'fats'>('calories')

    // Modal visibility state
    const [topRangeModalVisible, setTopRangeModalVisible] = useState(false)
    const [bottomRangeModalVisible, setBottomRangeModalVisible] = useState(false)
    const [selectionModalVisible, setSelectionModalVisible] = useState(false)

    // Set selected exercise to last exercise if it exists
    useEffect(() => {
        if (lastExercise) {
            setSelectedExercise(lastExercise)
        }
    }, [lastExercise])

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

    const topData = useMemo(() => {
        if (mode) {
            return downsampleDataPreserveEndpoints(topRawData, 7, 0, 'max')
        }
        const bucketSize = topRange / 7
        return downsampleData(topRawData, bucketSize, 1, 'avg')
    }, [topRawData, topRange, mode])

    // BOTTOM card (bars) — Sets (lift) / Calories+Macros (nutrition)
    const bottomRawData = useMemo(() => {
        const rawData = mode === true ? handleGetSetsData(settings.onboardingCompletedAt) : handleGetMacroDataForGraph(selectedMacro, settings.onboardingCompletedAt)
        const startIndex = Math.max(0, rawData.length - bottomRange)
        return rawData.slice(startIndex)
    }, [mode, selectedMacro, bottomRange, logs, nutritionData, handleGetSetsData, handleGetMacroDataForGraph, settings.onboardingCompletedAt])

    const bottomData = useMemo(() => {
        const bucketSize = bottomRange / 7
        const aggregation = mode ? 'sum' : 'avg'
        return downsampleData(bottomRawData, bucketSize, 0, aggregation)
    }, [bottomRawData, bottomRange, mode])

    // Signatures for keying so the chart re-renders when data changes
    const topSig = `${topData.length}:${topData.at(-1)?.day ?? ''}:${topData.at(-1)?.value ?? ''}`
    const bottomSig = `${bottomData.length}:${bottomData.at(-1)?.day ?? ''}:${bottomData.at(-1)?.value ?? ''}`

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
    const topTitle = mode ? 'Strength' : 'Body Weight'
    const topSubtitle = mode ? 'Estimated 1 rep max' : 'Daily'
    const bottomTitle = mode ? 'Sets' : selectedMacro.charAt(0).toUpperCase() + selectedMacro.slice(1)
    const bottomSubtitle = mode ? 'Total per day' : 'Daily intake'

    return (
        <>
            <ModeSwitcher />
            <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
                <ActivityBanner mode={mode} workoutDaysThisWeek={workoutDaysThisWeek} nutritionStreak={nutritionStreak} />

                {/* TOP card — line chart */}
                <View style={styles.graphCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{topTitle}</Text>
                        <Text style={styles.cardSubtitle}>{topSubtitle}</Text>
                    </View>
                    <View style={styles.chartContainer}>
                        {topData.length > 0 ?
                            <Graph1
                                key={`top-${mode ? 'lift' : 'nutrition'}-${topRange}-${mode ? selectedExercise : 'bw'}-${topSig}`}
                                mode={mode}
                                data={topData}
                                selectedRange={topRange}
                                chartNote={getGraphChartNote(mode ? 'strength' : 'bodyweight', topRange)}
                                goal={topGoal}
                                formatValue={topFormat}
                            />
                        :   <View style={styles.emptyGraphState}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: accent + '1A' }]}>
                                    {mode === true ?
                                        <Dumbbell size={48} color={colors.workout} strokeWidth={2} />
                                    :   <Scale size={48} color={colors.nutrition} strokeWidth={2} />}
                                </View>
                                <Text style={styles.emptyGraphText}>{mode === true ? 'No data yet for this exercise' : 'No weight data yet'}</Text>
                                <Text style={styles.emptyGraphSubtext}>{mode === true ? 'Start logging workouts to see your progress' : 'Update your body weight to see progress'}</Text>
                            </View>
                        }
                    </View>
                    <GraphStats graphType={mode ? 'orm' : 'bodyweight'} data={topData} statsData={topRawData} unitSystem={settings.unitSystem} mode={mode} goalWeight={settings.goalWeight} />
                    {/* Button Row */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: accent }]} onPress={() => setTopRangeModalVisible(true)}>
                            <View style={styles.graphButtonInner}>
                                <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                    Last {topRange} {mode ? 'Lifts' : 'Days'}
                                </Text>
                                <ChevronDown size={20} color="#fff" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                        {mode && (
                            <TouchableOpacity style={[styles.graphButton, { backgroundColor: accent }]} onPress={() => setSelectionModalVisible(true)}>
                                <View style={styles.graphButtonInner}>
                                    <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                        {selectedExercise}
                                    </Text>
                                    <ChevronDown size={20} color="#fff" strokeWidth={2} />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Body Weight card (nutrition mode) — sits next to the body-weight graph */}
                {mode === false && (
                    <View style={styles.bwContainer}>
                        <BwCard />
                    </View>
                )}

                {/* BOTTOM card — bar chart */}
                <View style={styles.graphCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{bottomTitle}</Text>
                        <Text style={styles.cardSubtitle}>{bottomSubtitle}</Text>
                    </View>
                    <View style={styles.chartContainer}>
                        {bottomData.length > 0 ?
                            <BarChart
                                key={`bottom-${mode ? 'lift' : 'nutrition'}-${bottomRange}-${mode ? 'sets' : selectedMacro}-${bottomSig}`}
                                mode={mode}
                                data={bottomData}
                                selectedRange={bottomRange}
                                chartNote={getGraphChartNote(mode ? 'sets' : 'macro', bottomRange)}
                                goal={bottomGoal}
                                formatValue={bottomFormat}
                            />
                        :   <View style={styles.emptyGraphState}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: accent + '1A' }]}>
                                    {mode === true ?
                                        <Dumbbell size={48} color={colors.workout} strokeWidth={2} />
                                    :   <Scale size={48} color={colors.nutrition} strokeWidth={2} />}
                                </View>
                                <Text style={styles.emptyGraphText}>{mode === true ? 'No set data yet' : 'No nutrition data yet'}</Text>
                                <Text style={styles.emptyGraphSubtext}>{mode === true ? 'Start logging workouts to see your sets' : 'Start logging meals to see your intake'}</Text>
                            </View>
                        }
                    </View>
                    <GraphStats graphType={mode ? 'sets' : selectedMacro} data={bottomData} statsData={bottomRawData} unitSystem={settings.unitSystem} mode={mode} goal={mode ? undefined : nutritionGoal} />
                    {/* Button Row */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: accent }]} onPress={() => setBottomRangeModalVisible(true)}>
                            <View style={styles.graphButtonInner}>
                                <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                    Last {bottomRange} Days
                                </Text>
                                <ChevronDown size={20} color="#fff" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                        {!mode && (
                            <TouchableOpacity style={[styles.graphButton, { backgroundColor: accent }]} onPress={() => setSelectionModalVisible(true)}>
                                <View style={styles.graphButtonInner}>
                                    <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                        {selectedMacro.charAt(0).toUpperCase() + selectedMacro.slice(1)}
                                    </Text>
                                    <ChevronDown size={20} color="#fff" strokeWidth={2} />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modals */}
            <RangeSelectionModal visible={topRangeModalVisible} onClose={() => setTopRangeModalVisible(false)} selectedRange={topRange} onSelectRange={setTopRange} mode={mode} rangeUnit={mode ? 'Lifts' : 'Days'} />

            <RangeSelectionModal visible={bottomRangeModalVisible} onClose={() => setBottomRangeModalVisible(false)} selectedRange={bottomRange} onSelectRange={setBottomRange} mode={mode} rangeUnit="Days" />

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
            marginBottom: 8,
        },
        cardTitle: {
            fontSize: 20,
            color: colors.text,
            letterSpacing: -0.4,
            fontFamily: fonts.extrabold,
        },
        cardSubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 2,
            fontFamily: fonts.medium,
        },
        graphCard: {
            width: '100%',
            height: 450,
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
        buttonRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 12,
        },
        graphButton: {
            flex: 1,
            flexDirection: 'row',
            paddingVertical: 14,
            borderRadius: radius.card,
            alignItems: 'center',
            justifyContent: 'center',
        },
        graphButtonInner: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
        },
        graphButtonText: {
            fontSize: 14,
            color: '#fff',
            letterSpacing: -0.3,
            fontFamily: fonts.bold,
        },
    })
}
