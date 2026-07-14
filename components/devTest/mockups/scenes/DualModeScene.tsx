import ProgressWheel from '@/components/GraphComponents/ProgressWheel'
import Entry from '@/components/NutritionComponents/Entry'
import Log from '@/components/WorkoutComponents/Log'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Entypo } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Calendar, Dumbbell, Nut } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Field, Segmented } from '../../DevControls'
import MockupShell from '../MockupShell'
import { CALORIE_GOAL, MOCK_INTAKE, MOCK_MEALS, MOCK_WORKOUTS } from '../mockData'

/**
 * App Store mockup (frame 1): one phone, the home screen split down the middle —
 * lift mode on the left, nutrition mode on the right — with the ModeSwitcher
 * centered so the split line lands between its two buttons. Both halves are full
 * home-screen recompositions clipped to their side; the Split control previews
 * either mode full-screen.
 */

const NOOP = () => {}

function StaticModeSwitcher({ lift }: { lift: boolean }) {
    const colors = useColors()
    const styles = useMemo(() => makeSwitcherStyles(colors), [colors])

    const renderModeButton = (isLift: boolean) => {
        const isActive = lift === isLift
        const Icon = isLift ? Dumbbell : Nut
        const iconColor = isActive ? '#FFFFFF' : colors.tabInactive
        const icon = <Icon size={25} color={iconColor} strokeWidth={2.0} style={isLift ? styles.dumbbellIcon : undefined} />

        if (isActive) {
            return (
                <View style={[styles.modeButton, styles.activeModeButton]}>
                    <LinearGradient colors={isLift ? colors.workoutGradient : colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientButton}>
                        <View style={styles.modeLabelRow}>{icon}</View>
                    </LinearGradient>
                </View>
            )
        }
        return (
            <View style={[styles.modeButton, styles.inactiveModeButton]}>
                <View style={styles.modeLabelRow}>{icon}</View>
            </View>
        )
    }

    return (
        <View style={styles.header}>
            <View style={styles.modeSelectorContainer}>
                {renderModeButton(true)}
                {renderModeButton(false)}
            </View>
        </View>
    )
}

function StaticFab({ lift }: { lift: boolean }) {
    const colors = useColors()
    return (
        <View style={[fabStyles.fab, { shadowColor: lift ? colors.workout : colors.nutrition }]}>
            <LinearGradient colors={lift ? colors.workoutGradient : colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fabStyles.gradientFab}>
                <Entypo name="dots-three-vertical" size={28} color="white" />
            </LinearGradient>
        </View>
    )
}

function MacroBarRow({ label, value, pct, styles }: { label: string; value: string; pct: number; styles: ReturnType<typeof makePaneStyles> }) {
    const width = `${Math.min(100, Math.max(0, pct))}%` as const
    return (
        <View>
            <View style={styles.barHeader}>
                <Text style={styles.barLabel}>{label}</Text>
                <Text style={styles.barValue}>{value}</Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width }]} />
            </View>
        </View>
    )
}

function StaticIntakeCard({ styles }: { styles: ReturnType<typeof makePaneStyles> }) {
    const colors = useColors()
    const caloriePct = (MOCK_INTAKE.calories / CALORIE_GOAL) * 100
    const remaining = Math.round(CALORIE_GOAL - MOCK_INTAKE.calories)

    return (
        <View style={styles.intakeCard}>
            <ProgressWheel percent={caloriePct} size={110} strokeWidth={13} color={colors.nutrition}>
                <View style={styles.wheelCenter}>
                    <Text style={styles.calNumber}>{MOCK_INTAKE.calories}</Text>
                    <Text style={styles.calGoal}>/ {CALORIE_GOAL}</Text>
                </View>
            </ProgressWheel>
            <View style={styles.intakeRight}>
                <Text style={styles.kcalLeft}>{remaining.toLocaleString()} kcal left</Text>
                <View style={styles.bars}>
                    <MacroBarRow label="Fats" value={`${MOCK_INTAKE.fats}g`} pct={(MOCK_INTAKE.fats / MOCK_INTAKE.fatsGoal) * 100} styles={styles} />
                    <MacroBarRow label="Carbs" value={`${MOCK_INTAKE.carbs}g`} pct={(MOCK_INTAKE.carbs / MOCK_INTAKE.carbsGoal) * 100} styles={styles} />
                    <MacroBarRow label="Protein" value={`${MOCK_INTAKE.protein}g`} pct={(MOCK_INTAKE.protein / MOCK_INTAKE.proteinGoal) * 100} styles={styles} />
                </View>
            </View>
        </View>
    )
}

function HomePane({ lift }: { lift: boolean }) {
    const colors = useColors()
    const styles = useMemo(() => makePaneStyles(colors), [colors])

    return (
        <View style={styles.pane}>
            <StaticModeSwitcher lift={lift} />
            {lift ?
                <View style={styles.workoutList}>
                    <Text style={styles.workoutTitle}>Workouts</Text>
                    <Text style={styles.workoutSubtitle}>{MOCK_WORKOUTS.length} routines</Text>
                    {MOCK_WORKOUTS.map((w) => (
                        <Log key={w.name} text={w.name} subtitle={`${w.exercises} exercises`} onPress={NOOP} onEditPress={NOOP} onMenuPress={NOOP} />
                    ))}
                </View>
            :   <View style={styles.nutritionList}>
                    <View style={styles.titleBlock}>
                        <Text style={styles.screenTitle}>Nutrition</Text>
                    </View>
                    <View style={styles.intakeContainer}>
                        <StaticIntakeCard styles={styles} />
                    </View>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Logged Meals</Text>
                        <View style={styles.dateChip}>
                            <Calendar size={18} color={colors.nutrition} strokeWidth={2.5} />
                            <Text style={styles.dateChipText}>Today</Text>
                        </View>
                    </View>
                    {MOCK_MEALS.map((m) => (
                        <Entry key={m.name} name={m.name} calories={m.calories} protein={m.protein} carbs={m.carbs} fats={m.fats} showBreakdown={m.isPhoto} onEditPress={NOOP} onBreakdownPress={NOOP} />
                    ))}
                </View>
            }
            <StaticFab lift={lift} />
        </View>
    )
}

export default function DualModeScene({ initialLift: _initialLift }: { initialLift: boolean }) {
    const [split, setSplit] = useState(0.5)
    const [divider, setDivider] = useState(true)
    const colors = useColors()
    const { width } = useWindowDimensions()

    const controls = (
        <>
            <Field label="Split">
                <Segmented
                    value={String(split)}
                    onChange={(v) => setSplit(Number(v))}
                    options={[
                        { label: 'Lift', value: '1' },
                        { label: '50 / 50', value: '0.5' },
                        { label: 'Nutrition', value: '0' },
                    ]}
                />
            </Field>
            <Field label="Divider">
                <Segmented
                    value={divider ? 'on' : 'off'}
                    onChange={(v) => setDivider(v === 'on')}
                    options={[
                        { label: 'On', value: 'on' },
                        { label: 'Off', value: 'off' },
                    ]}
                />
            </Field>
        </>
    )

    const splitX = width * split

    return (
        <MockupShell controls={controls}>
            <View style={sceneStyles.root}>
                {split > 0 && (
                    <View style={[sceneStyles.clip, { left: 0, width: splitX }]}>
                        <View style={{ width, height: '100%' }}>
                            <HomePane lift />
                        </View>
                    </View>
                )}
                {split < 1 && (
                    <View style={[sceneStyles.clip, { right: 0, width: width - splitX }]}>
                        <View style={{ width, height: '100%', marginLeft: -splitX }}>
                            <HomePane lift={false} />
                        </View>
                    </View>
                )}
                {divider && split > 0 && split < 1 && <View style={[sceneStyles.divider, { left: splitX - 1, backgroundColor: colors.hairline }]} />}
            </View>
        </MockupShell>
    )
}

const sceneStyles = StyleSheet.create({
    root: {
        flex: 1,
    },
    clip: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    divider: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
    },
})

// Verbatim copy of the ModeSwitcher styles so the clone renders identically.
function makeSwitcherStyles(colors: Colors) {
    return StyleSheet.create({
        header: {
            height: 100,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            paddingHorizontal: 10,
            paddingTop: 10,
            zIndex: 100,
        },
        modeSelectorContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 30,
            backgroundColor: colors.toggleTrack,
            borderRadius: radius.toggle,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            gap: 4,
            padding: 4,
        },
        modeButton: {
            flex: 1,
            borderRadius: radius.toggleInner,
            overflow: 'hidden',
            minHeight: 42,
        },
        activeModeButton: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 9,
            elevation: 4,
        },
        inactiveModeButton: {
            backgroundColor: 'transparent',
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        gradientButton: {
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        modeLabelRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        dumbbellIcon: {
            transform: [{ rotate: '45deg' }],
        },
    })
}

const fabStyles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 15,
        bottom: 20,
        width: 80,
        height: 80,
        borderRadius: 40,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 9,
        elevation: 8,
        zIndex: 10,
    },
    gradientFab: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

// Layout mirrors workoutScreen.tsx / nutritionScreen.tsx; the intake card styles
// mirror DailyIntakeCard so the canned version is pixel-identical.
function makePaneStyles(colors: Colors) {
    return StyleSheet.create({
        pane: {
            flex: 1,
            backgroundColor: colors.background,
        },
        workoutList: {
            paddingHorizontal: 20,
            paddingTop: 16,
        },
        workoutTitle: {
            fontSize: 26,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.extrabold,
        },
        workoutSubtitle: {
            fontSize: 13,
            color: colors.labelMuted,
            marginTop: 2,
            marginBottom: 14,
            fontFamily: fonts.medium,
        },
        nutritionList: {
            paddingTop: 16,
        },
        titleBlock: {
            paddingHorizontal: 20,
        },
        screenTitle: {
            fontSize: 26,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 14,
            fontFamily: fonts.extrabold,
        },
        intakeContainer: {
            paddingHorizontal: 20,
        },
        sectionHeader: {
            paddingHorizontal: 20,
            marginTop: 10,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        sectionTitle: {
            fontSize: 22,
            flex: 1,
            flexShrink: 1,
            color: colors.text,
            letterSpacing: -0.5,
            marginRight: 12,
            fontFamily: fonts.extrabold,
        },
        dateChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 9,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        dateChipText: {
            fontSize: 13,
            color: colors.nutrition,
            fontFamily: fonts.bold,
        },
        intakeCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 20,
            marginBottom: 16,
        },
        wheelCenter: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        calNumber: {
            fontFamily: fonts.extrabold,
            fontSize: 24,
            color: colors.text,
            lineHeight: 30,
        },
        calGoal: {
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 3,
        },
        intakeRight: {
            flex: 1,
        },
        kcalLeft: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: colors.labelMuted,
            marginBottom: 12,
        },
        bars: {
            gap: 11,
        },
        barHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 5,
        },
        barLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.textSecondary,
        },
        barValue: {
            fontFamily: fonts.bold,
            fontSize: 13,
            color: colors.text,
        },
        track: {
            height: 7,
            backgroundColor: colors.ringTrack,
            borderRadius: 4,
            overflow: 'hidden',
        },
        fill: {
            height: '100%',
            backgroundColor: colors.nutrition,
            borderRadius: 4,
        },
    })
}
