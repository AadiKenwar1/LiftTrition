import ActivityBanner from '@/components/GraphComponents/ActivityBanner'
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

    // Local state for graph selections
    const [selectedRange1, setSelectedRange1] = useState<7 | 14 | 21>(7)
    const [selectedRange2, setSelectedRange2] = useState<7 | 14 | 21>(7)
    const [selectedExercise, setSelectedExercise] = useState<string>(lastExercise || 'Barbell Bench Press')
    const [selectedMacro, setSelectedMacro] = useState<'calories' | 'protein' | 'carbs' | 'fats'>('calories')

    // Modal visibility state
    const [rangeModalVisible1, setRangeModalVisible1] = useState(false)
    const [rangeModalVisible2, setRangeModalVisible2] = useState(false)
    const [selectionModalVisible, setSelectionModalVisible] = useState(false)

    // Set selected exercise to last exercise if it exists
    useEffect(() => {
        if (lastExercise) {
            setSelectedExercise(lastExercise)
        }
    }, [lastExercise])

    // Data for selection modal
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

    // Graph 1 — display (downsampled) + stats (raw daily slice)
    const graph1RawData = useMemo(() => {
        const rawData = mode === true ? handleGetOneRepMaxData(selectedExercise) : handleGetMacroDataForGraph(selectedMacro, settings.onboardingCompletedAt)
        const startIndex = Math.max(0, rawData.length - selectedRange1)
        return rawData.slice(startIndex)
    }, [mode, selectedExercise, selectedMacro, selectedRange1, logs, nutritionData, lastExercise, handleGetOneRepMaxData, handleGetMacroDataForGraph, settings.onboardingCompletedAt])

    const graph1Data = useMemo(() => {
        if (mode) {
            return downsampleDataPreserveEndpoints(graph1RawData, 7, 0, 'max')
        }
        const bucketSize = selectedRange1 / 7
        return downsampleData(graph1RawData, bucketSize, 0, 'avg')
    }, [graph1RawData, selectedRange1, mode])

    // Graph 2 — display (downsampled) + stats (raw daily slice)
    const graph2RawData = useMemo(() => {
        const rawData = mode === true ? handleGetSetsData(settings.onboardingCompletedAt) : handleGetBodyWeightProgressData(settings.onboardingCompletedAt)
        const startIndex = Math.max(0, rawData.length - selectedRange2)
        return rawData.slice(startIndex)
    }, [mode, logs, bwProgress, selectedRange2, settings.onboardingCompletedAt, handleGetSetsData, handleGetBodyWeightProgressData])

    const graph2Data = useMemo(() => {
        const bucketSize = selectedRange2 / 7
        const precision = mode === false ? 1 : 0
        const aggregation = mode ? 'sum' : 'avg'
        return downsampleData(graph2RawData, bucketSize, precision, aggregation)
    }, [graph2RawData, selectedRange2, mode])

    //Graph 1 and 2 signatures for keying so that the graph re-renders when the data changes
    const graph1Sig = `${graph1Data.length}:${graph1Data.at(-1)?.day ?? ''}:${graph1Data.at(-1)?.value ?? ''}`
    const graph2Sig = `${graph2Data.length}:${graph2Data.at(-1)?.day ?? ''}:${graph2Data.at(-1)?.value ?? ''}`

    const accent = mode ? colors.workout : colors.nutrition

    return (
        <>
            <ModeSwitcher />
            <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
                <ActivityBanner mode={mode} workoutDaysThisWeek={workoutDaysThisWeek} nutritionStreak={nutritionStreak} />

                {/* Graph 1 Card */}
                <Text style={styles.mainTitle}>{mode === true ? `Strength Graph` : `Nutrition Graph`}</Text>
                <View style={styles.graphCard}>
                    {graph1Data.length > 0 && (
                        <Text style={styles.graphSubtext}>
                            {mode ?
                                <>
                                    Graph displays estimated one rep max for <Text style={styles.graphSubtextAccent}>{selectedExercise}</Text> each training day
                                </>
                            :   <>
                                    Graph displays your <Text style={styles.graphSubtextAccent}>{selectedMacro.charAt(0).toUpperCase() + selectedMacro.slice(1)}</Text> intake by day
                                </>
                            }
                        </Text>
                    )}
                    <View style={styles.chartContainer}>
                        {graph1Data.length > 0 ?
                            <Graph1
                                key={`graph1-${mode ? 'lift' : 'nutrition'}-${selectedRange1}-${mode ? selectedExercise : selectedMacro}-${graph1Sig}`}
                                mode={mode}
                                data={graph1Data}
                                selectedRange={selectedRange1}
                                chartNote={getGraphChartNote(mode ? 'strength' : 'macro', selectedRange1)}
                            />
                        :   <View style={styles.emptyGraphState}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: accent + '1A' }]}>
                                    {mode === true ?
                                        <Dumbbell size={48} color={colors.workout} strokeWidth={2} />
                                    :   <Scale size={48} color={colors.nutrition} strokeWidth={2} />}
                                </View>
                                <Text style={styles.emptyGraphText}>No data yet for this exercise</Text>
                                <Text style={styles.emptyGraphSubtext}>Start logging workouts to see your progress</Text>
                            </View>
                        }
                    </View>
                    <GraphStats graphType={mode ? 'orm' : selectedMacro} data={graph1Data} statsData={graph1RawData} unitSystem={settings.unitSystem} mode={mode} />
                    {/* Button Row */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: accent }]} onPress={() => setRangeModalVisible1(true)}>
                            <View style={styles.graphButtonInner}>
                                <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                    Last {selectedRange1} {mode ? 'Lifts' : 'Days'}
                                </Text>
                                <ChevronDown size={20} color="#fff" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: accent }]} onPress={() => setSelectionModalVisible(true)}>
                            <View style={styles.graphButtonInner}>
                                <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                    {mode ? selectedExercise : selectedMacro.charAt(0).toUpperCase() + selectedMacro.slice(1)}
                                </Text>
                                <ChevronDown size={20} color="#fff" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Body Weight card (nutrition mode) — lives next to the body-weight graph */}
                {mode === false && (
                    <View style={styles.bwContainer}>
                        <BwCard />
                    </View>
                )}

                {/* Graph 2 Card */}
                <Text style={styles.mainTitle}>{mode === true ? `Sets Graph` : `Body Weight Graph`}</Text>
                <View style={styles.graphCard}>
                    {graph2Data.length > 0 && (
                        <Text style={styles.graphSubtext}>
                            {mode ?
                                <>
                                    Graph displays <Text style={styles.graphSubtextAccent}>total sets</Text> by day
                                </>
                            :   <>
                                    Graph displays <Text style={styles.graphSubtextAccent}>body weight</Text> by day
                                </>
                            }
                        </Text>
                    )}
                    <View style={styles.chartContainer}>
                        {graph2Data.length > 0 ?
                            <Graph1
                                key={`graph2-${mode ? 'lift' : 'nutrition'}-${selectedRange2}-${graph2Sig}`}
                                mode={mode}
                                data={graph2Data}
                                selectedRange={selectedRange2}
                                chartNote={getGraphChartNote(mode ? 'sets' : 'bodyweight', selectedRange2)}
                            />
                        :   <View style={styles.emptyGraphState}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: accent + '1A' }]}>
                                    {mode === true ?
                                        <Dumbbell size={48} color={colors.workout} strokeWidth={2} />
                                    :   <Scale size={48} color={colors.nutrition} strokeWidth={2} />}
                                </View>
                                <Text style={styles.emptyGraphText}>{mode === true ? 'No set data yet' : 'No weight data yet'}</Text>
                                <Text style={styles.emptyGraphSubtext}>{mode === true ? 'Start logging workouts to see your sets' : 'Update your body weight to see progress'}</Text>
                            </View>
                        }
                    </View>
                    <GraphStats graphType={mode ? 'sets' : 'bodyweight'} data={graph2Data} statsData={graph2RawData} unitSystem={settings.unitSystem} mode={mode} goalWeight={settings.goalWeight} />
                    {/* Button Row */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: accent }]} onPress={() => setRangeModalVisible2(true)}>
                            <View style={styles.graphButtonInner}>
                                <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                    Last {selectedRange2} Days
                                </Text>
                                <ChevronDown size={20} color="#fff" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Modals */}
            <RangeSelectionModal visible={rangeModalVisible1} onClose={() => setRangeModalVisible1(false)} selectedRange={selectedRange1} onSelectRange={setSelectedRange1} mode={mode} rangeUnit={mode ? 'Lifts' : 'Days'} />

            <RangeSelectionModal visible={rangeModalVisible2} onClose={() => setRangeModalVisible2(false)} selectedRange={selectedRange2} onSelectRange={setSelectedRange2} mode={mode} rangeUnit="Days" />

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
        mainTitle: {
            fontSize: 22,
            flexShrink: 1,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 8,
            fontFamily: fonts.extrabold,
        },
        graphCard: {
            width: '100%',
            height: 540,
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
        graphSubtext: {
            fontFamily: fonts.regular,
            fontSize: 14,
            color: colors.textSecondary,
            letterSpacing: -0.2,
            textAlign: 'center',
            paddingHorizontal: 8,
            marginBottom: 16,
            lineHeight: 18,
        },
        graphSubtextAccent: {
            fontFamily: fonts.semibold,
            color: colors.text,
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
