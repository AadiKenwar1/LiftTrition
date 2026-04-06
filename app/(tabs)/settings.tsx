import { useSettings } from '@/context/SettingsContext'
import { powerSync } from '@/lib/powersync/system'
import { formatDateTime } from '@/lib/utils/dateHelper'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { ChevronRight, CreditCard, Dumbbell, FileText, HelpCircle, Plus, Scale, User, Utensils } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
interface SettingsOption {
    icon: React.ComponentType<any>
    iconColor: string
    title: string
    subtitle?: string
    onPress: () => void
}

export default function SettingsScreen() {
    const router = useRouter()
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | undefined>(() => powerSync.currentStatus.lastSyncedAt)
    const { mode } = useSettings()

    useEffect(() => {
        const unsubscribe = powerSync.registerListener({
            statusChanged: (status) => {
                setLastSyncedAt(status.lastSyncedAt)
            },
        })
        return () => unsubscribe?.()
    }, [])

    const settingsOptions: SettingsOption[] = [
        {
            icon: User,
            iconColor: '#FFF',
            title: 'Profile',
            subtitle: 'Edit your personal information',
            onPress: () => router.push('/settingsScreens/profile'),
        },
        {
            icon: CreditCard,
            iconColor: '#FFF',
            title: 'Subscription',
            subtitle: 'Manage your subscription plan',
            onPress: () => router.push('/settingsScreens/subscription'),
        },
        {
            icon: Utensils,
            iconColor: '#FFF',
            title: 'Adjust Nutrition',
            subtitle: 'Customize your nutrition goals',
            onPress: () => router.push('/settingsScreens/adjustNutrition/adjustNutrition1'),
        },
        {
            icon: Scale,
            iconColor: '#FFF',
            title: 'Adjust Measurements',
            subtitle: 'Customize your measurements',
            onPress: () => router.push('/settingsScreens/adjustMeasurements'),
        },
        {
            icon: Dumbbell,
            iconColor: '#FFF',
            title: 'Adjust Training',
            subtitle: 'Personalize your workout plan',
            onPress: () => router.push('/settingsScreens/adjustTraining'),
        },
        {
            icon: Plus,
            iconColor: '#FFF',
            title: 'Add Exercise',
            subtitle: 'Create custom exercises',
            onPress: () => router.push('/settingsScreens/createExercise/createExercise1'),
        },
        {
            icon: FileText,
            iconColor: '#FFF',
            title: 'Terms and Privacy',
            subtitle: 'Read the terms of service and privacy policy',
            onPress: () => router.push('/settingsScreens/termsAndPrivacy'),
        },
        {
            icon: HelpCircle,
            iconColor: '#FFF',
            title: 'Support and Feature Requests',
            subtitle: 'Get help and request features',
            onPress: () => router.push('/settingsScreens/support'),
        },
    ]

    const renderSettingItem = (option: SettingsOption, index: number) => {
        const Icon = option.icon
        return (
            <TouchableOpacity key={index} style={styles.settingItem} onPress={option.onPress} activeOpacity={0.5}>
                <View style={styles.iconContainer}>
                    <Icon size={22} color={option.iconColor} strokeWidth={2.5} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    {option.subtitle && <Text style={styles.settingSubtitle}>{option.subtitle}</Text>}
                </View>
                <ChevronRight size={18} color="#666" strokeWidth={2} />
            </TouchableOpacity>
        )
    }

    return (
        <View style={styles.outerContainer}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.07)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.headerSubtitle}>Manage your preferences</Text>
                    {lastSyncedAt ?
                        <Text style={styles.lastSynced}>Last synced: {formatDateTime(lastSyncedAt)}</Text>
                    : powerSync.currentStatus.connected ?
                        <Text style={styles.lastSynced}>Syncing...</Text>
                    :   null}
                    <Text style={styles.lastSynced}>Current Mode: {mode ? 'LIFT' : 'NUTRITION'}</Text>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    {renderSettingItem(settingsOptions[0], 0)}
                    {renderSettingItem(settingsOptions[1], 1)}
                </View>

                {/* Goals Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>GOAL ADJUSTMENTS</Text>
                    {renderSettingItem(settingsOptions[2], 2)}
                    {renderSettingItem(settingsOptions[3], 3)}
                    {renderSettingItem(settingsOptions[4], 4)}
                </View>

                {/* Customization Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CUSTOMIZATION</Text>
                    {renderSettingItem(settingsOptions[5], 5)}
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>
                    {renderSettingItem(settingsOptions[6], 6)}
                    {renderSettingItem(settingsOptions[7], 7)}
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
        zIndex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 32,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 34,
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 4,
        fontFamily: 'Poppins_600SemiBold',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    lastSynced: {
        fontSize: 13,
        color: '#666',
        letterSpacing: 0.2,
        marginTop: 8,
        fontFamily: 'Poppins_400Regular',
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 12,
        color: '#666',
        letterSpacing: -0.5,
        marginBottom: 10,
        marginLeft: 4,
        fontFamily: 'Poppins_600SemiBold',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        backgroundColor: '#2a2a2a',
        borderWidth: 1,
        borderColor: '#333',
    },
    textContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 2,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#aaa',
        letterSpacing: 0.2,
        lineHeight: 16,
        fontFamily: 'Poppins_400Regular',
    },
})
