import NutritionScreen from '@/app/nutritionScreens/nutritionScreen'
import WorkoutScreen from '@/app/workoutScreens/workoutScreen'
import Fab from '@/components/NeutralComponents/Fab'
import ModeSwitcher from '@/components/NeutralComponents/ModeSwitcher'
import { useBilling } from '@/context/BillingContext'
import { useSettings } from '@/context/SettingsContext'
import { useColors, type Colors } from '@/context/ThemeContext'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Fragment, useMemo } from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'

export default function LogScreen() {
    const { mode } = useSettings()
    const router = useRouter()
    const { hasPremium } = useBilling()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    return (
        <>
            <ModeSwitcher />
            {mode ?
                <WorkoutScreen />
            :   <NutritionScreen />}
            <Fab>
                {mode === true ?
                    [
                        // Add Workout Button
                        <TouchableOpacity activeOpacity={0.75} key="add-workout" style={[styles.workoutFabButtons]} onPress={() => router.push('/workoutScreens/addWorkoutModal')}>
                            <Ionicons name="add" size={35} color="white" shadowColor="black" shadowRadius={0} shadowOpacity={0} />
                        </TouchableOpacity>,

                        // View Archived Workouts Button
                        <TouchableOpacity
                            activeOpacity={0.75}
                            key="archive"
                            style={[styles.workoutFabButtons]}
                            onPress={() =>
                                router.push({
                                    pathname: '/workoutScreens/archiveModal',
                                    params: { logType: 'workouts' },
                                })
                            }
                        >
                            <Ionicons name="archive-outline" size={35} color="white" shadowColor="black" shadowRadius={0} shadowOpacity={0} />
                        </TouchableOpacity>,

                        //Coming Soon - AI Workout Generator (react fragment to even out the buttons)

                        //Placeholder for even out the buttons
                        <Fragment key="placeholder"></Fragment>,
                        <Fragment key="placeholder2"></Fragment>,
                    ]
                :   [
                        //Add Nutrition Button
                        <TouchableOpacity activeOpacity={0.75} key="add-nutrition" style={[styles.nutritionFabButtons]} onPress={() => router.push('/nutritionScreens/addNutritionModal')}>
                            <Ionicons name="add" size={35} color="#FFFFFF" shadowColor="white" shadowRadius={0} shadowOpacity={0} />
                        </TouchableOpacity>,

                        //Camera Button
                        <TouchableOpacity activeOpacity={0.75} key="camera" style={[hasPremium ? styles.nutritionFabButtons : styles.nutritionUnavailableFabButtons]} onPress={() => (hasPremium ? router.push('/nutritionScreens/cameraScreen') : router.push('/settingsScreens/subscription'))}>
                            <Ionicons name="camera" size={35} color="#FFFFFF" shadowColor="white" shadowRadius={0} shadowOpacity={0} />
                        </TouchableOpacity>,

                        //Food Database Button
                        <TouchableOpacity activeOpacity={0.75} key="food-database" style={[hasPremium ? styles.nutritionFabButtons : styles.nutritionUnavailableFabButtons]} onPress={() => (hasPremium ? router.push('/nutritionScreens/foodDBModal') : router.push('/settingsScreens/subscription'))}>
                            <MaterialCommunityIcons name="database-search" size={35} color="#FFFFFF" shadowColor="white" shadowRadius={0} shadowOpacity={0} />
                        </TouchableOpacity>,

                        //Saved Foods Button
                        <TouchableOpacity activeOpacity={0.75} key="saved-foods" style={[styles.nutritionFabButtons]} onPress={() => router.push('/nutritionScreens/savedNutritionModal')}>
                            <Ionicons name="bookmark" size={35} color="#FFFFFF" shadowColor="white" shadowRadius={0} shadowOpacity={0} />
                        </TouchableOpacity>,
                    ]
                }
            </Fab>
        </>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        workoutFabButtons: {
            height: 60,
            width: 60,
            backgroundColor: colors.workout,
            borderRadius: 40,
            borderColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 3,
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            borderWidth: 0.0,
            zIndex: 10,
        },
        workoutUnavailableFabButtons: {
            height: 60,
            width: 60,
            backgroundColor: colors.textMuted,
            borderRadius: 40,
            borderColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 3,
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            borderWidth: 0.0,
            zIndex: 10,
        },
        nutritionFabButtons: {
            height: 60,
            width: 60,
            backgroundColor: colors.nutrition,
            borderRadius: 40,
            borderColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 3,
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            borderWidth: 0.0,
            zIndex: 10,
        },
        nutritionUnavailableFabButtons: {
            height: 60,
            width: 60,
            backgroundColor: colors.textMuted,
            borderRadius: 40,
            borderColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 3,
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            borderWidth: 0.0,
            zIndex: 10,
        },
    })
}
