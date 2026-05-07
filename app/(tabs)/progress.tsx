import Graph1 from '@/components/GraphComponents/Graph1'
import ProgressWheel from '@/components/GraphComponents/ProgressWheel'
import RangeSelectionModal from '@/components/GraphComponents/RangeSelectionModal'
import SelectionModal from '@/components/GraphComponents/SelectionModal'
import ModeSwitcher from '@/components/NeutralComponents/ModeSwitcher'
import { useNutrition } from '@/context/NutritionContext'
import { useSettings } from '@/context/SettingsContext'
import { useWorkout } from '@/context/WorkoutContext'
import { oneRMMap } from '@/context/WorkoutContext/functions/oneRepMaxFunctions'
import { downsampleData } from '@/lib/utils/downsample'
import { useFonts } from 'expo-font'
import { ChevronDown, Dumbbell, Scale } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ProgressScreen() {
    const [fontsLoaded] = useFonts({
        'SpaceMono-Regular': require('@/assets/fonts/SpaceMono-Regular.ttf'),
    })
    const { mode, settings } = useSettings()
    const { handleGetMacrosForDate, handleGetMacroDataForGraph, nutritionData } = useNutrition()
    const { handleGetFatigueSummary, getFatigueFeedback, logs, exercises, handleGetOneRepMaxData, handleGetSetsData, lastExercise, setLastExercise, fullExerciseLibAsList } = useWorkout()
    const { handleGetBodyWeightProgressData, bwProgress } = useSettings()

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

    // Get recent logs for the last 30 days used for fatigue calculations
    const recentLogs30 = useMemo(() => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        return logs.filter((l) => l.date >= cutoff && l.reps > 0 && l.weight > 0)
    }, [logs])

    // Get one rep max map for fatigue calculations
    const oneRmRefByName = useMemo(() => {
        return oneRMMap(exercises, recentLogs30 ?? [], 30)
    }, [recentLogs30])

    // Fatigue data for wheels
    const fatigueData = useMemo(() => {
        return handleGetFatigueSummary(settings.activityLevel, oneRmRefByName)
    }, [logs, settings.activityLevel, mode, oneRmRefByName, handleGetFatigueSummary])

    //Macro data for wheels
    const todayMacros = useMemo(() => {
        return handleGetMacrosForDate(new Date())
    }, [nutritionData, settings])

    //Graph 1 data (one rep max or macro data)
    const graph1Data = useMemo(() => {
        const rawData = mode === true ? handleGetOneRepMaxData(selectedExercise) : handleGetMacroDataForGraph(selectedMacro, settings.onboardingCompletedAt)
        const startIndex = Math.max(0, rawData.length - selectedRange1)
        const slicedData = rawData.slice(startIndex)
        const bucketSize = selectedRange1 / 7
        return downsampleData(slicedData, bucketSize)
    }, [mode, selectedExercise, selectedMacro, selectedRange1, logs, nutritionData, lastExercise, handleGetOneRepMaxData, handleGetMacroDataForGraph, settings.onboardingCompletedAt])

    //Graph 2 data (sets or body weight data)
    const graph2Data = useMemo(() => {
        const rawData = mode === true ? handleGetSetsData(settings.onboardingCompletedAt) : handleGetBodyWeightProgressData(settings.onboardingCompletedAt)
        const startIndex = Math.max(0, rawData.length - selectedRange2)
        const slicedData = rawData.slice(startIndex)
        const bucketSize = selectedRange2 / 7
        const downsampled = downsampleData(slicedData, bucketSize)
        return downsampled
    }, [mode, logs, bwProgress, selectedRange2, settings.onboardingCompletedAt, handleGetSetsData, handleGetBodyWeightProgressData])

    //Graph 1 and 2 signatures for keying so that the graph re-renders when the data changes
    const graph1Sig = `${graph1Data.length}:${graph1Data.at(-1)?.day ?? ''}:${graph1Data.at(-1)?.value ?? ''}`
    const graph2Sig = `${graph2Data.length}:${graph2Data.at(-1)?.day ?? ''}:${graph2Data.at(-1)?.value ?? ''}`

    //Calorie percentages for wheels
    const caloriePercent = (todayMacros.totalCalories / settings.calorieGoal) * 100
    const proteinPercent = (todayMacros.totalProtein / settings.proteinGoal) * 100
    const carbsPercent = (todayMacros.totalCarbs / settings.carbsGoal) * 100
    const fatsPercent = (todayMacros.totalFats / settings.fatsGoal) * 100
    const caloriesLeft = settings.calorieGoal - todayMacros.totalCalories

    return (
        <>
            <ModeSwitcher />
            <ScrollView contentContainerStyle={styles.container} style={{ flex: 1, backgroundColor: '#121212' }}>
                {/*Rectangular Card */}
                <Text style={styles.mainTitle} numberOfLines={2} adjustsFontSizeToFit>
                    {mode === true ? 'Todays Fatigue' : 'Todays Calories'}
                </Text>
                <View style={styles.rectangularCard}>
                    <ProgressWheel percent={mode === true ? fatigueData.today : caloriePercent} />
                    <View style={styles.textContainer}>
                        {mode === false && (
                            <Text style={styles.mainValue} numberOfLines={2} adjustsFontSizeToFit>
                                {Math.round(todayMacros.totalCalories)}/{settings.calorieGoal}
                            </Text>
                        )}
                        {mode === false && (
                            <Text style={styles.mainSubtext} numberOfLines={5} adjustsFontSizeToFit>
                                {caloriesLeft > 0 ? `You have ${caloriesLeft} calories to go!` : `You hit your calories goal!`}
                            </Text>
                        )}
                        {mode === true && (
                            <Text style={styles.mainSubtext} numberOfLines={5} adjustsFontSizeToFit>
                                {getFatigueFeedback(fatigueData.today)}
                            </Text>
                        )}
                    </View>
                </View>

                {/**Row of 3 cards */}
                <View style={styles.threeCardsRow}>
                    {/*1/3 Square Card*/}
                    <View style={styles.oneThirdColumn}>
                        <Text style={styles.oneThirdTopText} numberOfLines={2}>
                            {mode === true ? `Last 3 Days` : `Todays Protein`}
                        </Text>
                        <View style={styles.oneThirdSquareCard}>
                            <ProgressWheel percent={mode === true ? fatigueData.last3Days : proteinPercent} size={95} strokeWidth={9.5} fontSize={20} />
                            {mode === false && (
                                <Text style={styles.oneThirdBottomText}>
                                    {Math.round(todayMacros.totalProtein)}/{settings.proteinGoal}g
                                </Text>
                            )}
                        </View>
                    </View>

                    {/*1/3 Square Card*/}
                    <View style={styles.oneThirdColumn}>
                        <Text style={styles.oneThirdTopText} numberOfLines={2}>
                            {mode === true ? `Last 6 Days` : `Todays Carbs`}
                        </Text>
                        <View style={styles.oneThirdSquareCard}>
                            <ProgressWheel percent={mode === true ? fatigueData.last6Days : carbsPercent} size={95} strokeWidth={9.5} fontSize={20} />
                            {mode === false && (
                                <Text style={styles.oneThirdBottomText}>
                                    {Math.round(todayMacros.totalCarbs)}/{settings.carbsGoal}g
                                </Text>
                            )}
                        </View>
                    </View>

                    {/*1/3 Square Card*/}
                    <View style={styles.oneThirdColumn}>
                        <Text style={styles.oneThirdTopText} numberOfLines={2}>
                            {mode === true ? `Last 9 Days` : `Todays Fats`}
                        </Text>
                        <View style={styles.oneThirdSquareCard}>
                            <ProgressWheel percent={mode === true ? fatigueData.last9Days : fatsPercent} size={95} strokeWidth={9.5} fontSize={20} />
                            {mode === false && (
                                <Text style={styles.oneThirdBottomText}>
                                    {Math.round(todayMacros.totalFats)}/{settings.fatsGoal}g
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Graph 1 Card */}
                <Text style={styles.mainTitle}>{mode === true ? `Strength Graph` : `Nutrition Graph`}</Text>
                <View style={styles.graphCard}>
                    {graph1Data.length > 0 && (
                        <Text style={styles.graphSubtext}>
                            {mode ?
                                <>
                                    Graph displays estimated one rep max for <Text style={[styles.graphSubtext, { fontFamily: 'Poppins_600SemiBold' }]}>{selectedExercise}</Text> each training day
                                </>
                            :   <>
                                    Graph displays your <Text style={[styles.graphSubtext, { fontFamily: 'Poppins_600SemiBold' }]}>{selectedMacro.charAt(0).toUpperCase() + selectedMacro.slice(1)}</Text> intake by day
                                </>
                            }
                        </Text>
                    )}
                    <View style={styles.chartContainer}>
                        {graph1Data.length > 0 ?
                            <Graph1 key={`graph1-${mode ? 'lift' : 'nutrition'}-${selectedRange1}-${mode ? selectedExercise : selectedMacro}-${graph1Sig}`} mode={mode} data={graph1Data} selectedRange={selectedRange1} />
                        :   <View style={styles.emptyGraphState}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: mode === true ? 'rgba(45, 156, 255, 0.1)' : 'rgba(52, 199, 89, 0.1)' }]}>
                                    {mode === true ?
                                        <Dumbbell size={48} color="#2f80ed" strokeWidth={2} />
                                    :   <Scale size={48} color="#22C933" strokeWidth={2} />}
                                </View>
                                <Text style={styles.emptyGraphText}>No data yet for this exercise</Text>
                                <Text style={styles.emptyGraphSubtext}>Start logging workouts to see your progress</Text>
                            </View>
                        }
                    </View>
                    {/* Button Row */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: mode === true ? '#2f80ed' : '#22C933' }]} onPress={() => setRangeModalVisible1(true)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                                <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                    Last {selectedRange1} {mode ? 'Lifts' : 'Days'}
                                </Text>
                                <ChevronDown size={20} color="#fff" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: mode === true ? '#2f80ed' : '#22C933' }]} onPress={() => setSelectionModalVisible(true)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                                <Text style={styles.graphButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>
                                    {mode ? selectedExercise : selectedMacro.charAt(0).toUpperCase() + selectedMacro.slice(1)}
                                </Text>
                                <ChevronDown size={20} color="#fff" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Graph 2 Card */}
                <Text style={styles.mainTitle}>{mode === true ? `Sets Graph` : `Body Weight Graph`}</Text>
                <View style={styles.graphCard}>
                    {graph2Data.length > 0 && (
                        <Text style={styles.graphSubtext}>
                            {mode ?
                                <>
                                    Graph displays <Text style={[styles.graphSubtext, { fontFamily: 'Poppins_600SemiBold' }]}>total sets</Text> by day
                                </>
                            :   <>
                                    Graph displays <Text style={[styles.graphSubtext, { fontFamily: 'Poppins_600SemiBold' }]}>body weight</Text> by day
                                </>
                            }
                        </Text>
                    )}
                    <View style={styles.chartContainer}>
                        {graph2Data.length > 0 ?
                            <Graph1 key={`graph2-${mode ? 'lift' : 'nutrition'}-${selectedRange2}-${graph2Sig}`} mode={mode} data={graph2Data} selectedRange={selectedRange2} />
                        :   <View style={styles.emptyGraphState}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: mode === true ? 'rgba(45, 156, 255, 0.1)' : 'rgba(52, 199, 89, 0.1)' }]}>
                                    {mode === true ?
                                        <Dumbbell size={48} color="#2f80ed" strokeWidth={2} />
                                    :   <Scale size={48} color="#22C933" strokeWidth={2} />}
                                </View>
                                <Text style={styles.emptyGraphText}>{mode === true ? 'No set data yet' : 'No weight data yet'}</Text>
                                <Text style={styles.emptyGraphSubtext}>{mode === true ? 'Start logging workouts to see your sets' : 'Update your body weight to see progress'}</Text>
                            </View>
                        }
                    </View>
                    {/* Button Row */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.graphButton, { backgroundColor: mode === true ? '#2f80ed' : '#22C933' }]} onPress={() => setRangeModalVisible2(true)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
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
            <RangeSelectionModal visible={rangeModalVisible1} onClose={() => setRangeModalVisible1(false)} selectedRange={selectedRange1} onSelectRange={setSelectedRange1} mode={mode} />

            <RangeSelectionModal visible={rangeModalVisible2} onClose={() => setRangeModalVisible2(false)} selectedRange={selectedRange2} onSelectRange={setSelectedRange2} mode={mode} />

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

const styles = StyleSheet.create({
    container: {
        paddingTop: 10,
        paddingBottom: 60,
        paddingHorizontal: 15,
        backgroundColor: '#121212',
        width: '100%',
    },
    rectangularCard: {
        width: '100%',
        aspectRatio: 2.5,
        backgroundColor: '#282A2C',
        borderRadius: 15,
        marginBottom: 10,
        padding: 20,
        alignSelf: 'stretch',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    textContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        marginLeft: 10,
        marginTop: -10,
        gap: 5,
        flex: 1,
        paddingRight: 10,
    },
    threeCardsRow: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
        alignSelf: 'stretch',
    },
    oneThirdColumn: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
    },
    oneThirdSquareCard: {
        width: '100%',
        aspectRatio: 0.71,
        backgroundColor: '#282A2C',
        borderRadius: 15,
        marginBottom: 10,
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    oneThirdTopText: {
        fontSize: 13,
        marginBottom: 4,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_500Medium',
    },
    oneThirdBottomText: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 10,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_500Medium',
    },
    mainTitle: {
        fontSize: 22,
        flexShrink: 1,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 8,
        fontFamily: 'Poppins_600SemiBold',
    },
    mainValue: {
        fontSize: 20,
        textAlign: 'center',
        fontWeight: '700',
        flexShrink: 1,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    mainSubtext: {
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
        flexShrink: 1,
        color: '#aaa',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    graphCard: {
        width: '100%',
        height: 450,
        backgroundColor: '#282A2C',
        borderRadius: 15,
        marginBottom: 15,
        padding: 15,
        alignSelf: 'stretch',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 6,
    },
    graphTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.5,
        textAlign: 'center',
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    graphSubtext: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        fontWeight: '400',
        color: '#aaa',
        letterSpacing: -0.2,
        textAlign: 'center',
        paddingHorizontal: 8,
        marginBottom: 16,
        lineHeight: 18,
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
        fontWeight: '600',
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptyGraphSubtext: {
        fontSize: 14,
        fontWeight: '400',
        color: '#888',
        letterSpacing: 0.2,
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
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    graphButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3,
    },
})
