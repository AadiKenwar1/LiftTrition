import { useAuth } from '@/context/AuthContext'
import { useBilling } from '@/context/BillingContext'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { powerSync } from '@/lib/powersync/system'
import { getPendingUploadEstimate } from '@/lib/powersync/uploadQueueStats'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { ChevronRight, CreditCard, Dumbbell, FileText, FlaskConical, HelpCircle, Moon, Scale, Sun, User, Utensils } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface SettingsOption {
    icon: React.ComponentType<any>
    title: string
    subtitle?: string
    onPress: () => void
}

export default function SettingsScreen() {
    const router = useRouter()
    const { user } = useAuth()
    const { hasPremium } = useBilling()
    const colors = useColors()
    const colorScheme = useColorScheme()
    const setColorScheme = useSetColorScheme()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [uploadPendingEstimate, setUploadPendingEstimate] = useState<number | null>(null)

    useEffect(() => {
        let cancelled = false
        const poll = async () => {
            try {
                const stats = await powerSync.getUploadQueueStats()
                if (cancelled) return
                setUploadPendingEstimate(getPendingUploadEstimate(stats))
            } catch {
                if (cancelled) return
                setUploadPendingEstimate(null)
            }
        }
        void poll()
        const id = setInterval(() => void poll(), 1000)
        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [])

    const syncStatusLine = useMemo(() => {
        if (uploadPendingEstimate === null) return 'Checking sync…'
        if (uploadPendingEstimate <= 0) return 'Everything is up to date!'
        return `Syncing ${uploadPendingEstimate} changes...`
    }, [uploadPendingEstimate])

    const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim()
    const email = user?.email ?? ''
    const initials = (fullName ? fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('') : email[0] || 'U').toUpperCase()
    const isDark = colorScheme === 'dark'

    const settingsOptions: SettingsOption[] = [
        {
            icon: User,
            title: 'Profile',
            subtitle: 'Edit your personal information',
            onPress: () => router.push('/settingsScreens/profile'),
        },
        {
            icon: CreditCard,
            title: 'Subscription',
            subtitle: 'Manage your subscription plan',
            onPress: () => router.push('/settingsScreens/subscription'),
        },
        {
            icon: Utensils,
            title: 'Adjust Nutrition',
            subtitle: 'Customize your nutrition goals',
            onPress: () => router.push('/settingsScreens/adjustNutrition/adjustNutrition1'),
        },
        {
            icon: Scale,
            title: 'Adjust Measurements',
            subtitle: 'Customize your measurements',
            onPress: () => router.push('/settingsScreens/adjustMeasurements'),
        },
        {
            icon: Dumbbell,
            title: 'Adjust Training',
            subtitle: 'Personalize your workout plan',
            onPress: () => router.push('/settingsScreens/adjustTraining'),
        },
        {
            icon: FileText,
            title: 'Terms and Privacy',
            subtitle: 'Read the terms of service and privacy policy',
            onPress: () => router.push('/settingsScreens/termsAndPrivacy'),
        },
        {
            icon: FlaskConical,
            title: 'How It Works',
            subtitle: 'The science behind your goals and fatigue score',
            onPress: () => router.push('/settingsScreens/howItWorks'),
        },
        {
            icon: HelpCircle,
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
                    <Icon size={22} color={colors.text} strokeWidth={2.5} />
                </View>
                <View style={styles.itemTextContainer}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    {option.subtitle && <Text style={styles.settingSubtitle}>{option.subtitle}</Text>}
                </View>
                <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
            </TouchableOpacity>
        )
    }

    const renderAppearanceItem = () => (
        <TouchableOpacity style={styles.settingItem} onPress={() => setColorScheme(isDark ? 'light' : 'dark')} activeOpacity={0.5}>
            <View style={styles.iconContainer}>{isDark ? <Moon size={22} color={colors.text} strokeWidth={2.5} /> : <Sun size={22} color={colors.text} strokeWidth={2.5} />}</View>
            <View style={styles.itemTextContainer}>
                <Text style={styles.settingTitle}>Appearance</Text>
                <Text style={styles.settingSubtitle}>Switch between dark and light mode</Text>
            </View>
            <Text style={styles.trailingValue}>{isDark ? 'Dark' : 'Light'}</Text>
        </TouchableOpacity>
    )

    return (
        <View style={styles.outerContainer}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/settingsScreens/devStatsModal')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Open developer stats">
                        <Text style={styles.title}>Settings</Text>
                    </TouchableOpacity>
                    <Text style={styles.lastUpdated}>{syncStatusLine}</Text>
                </View>

                {/* Profile card */}
                <View style={styles.profileCard}>
                    <LinearGradient colors={[colors.workout, colors.nutrition]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                    <View style={styles.profileText}>
                        <Text style={styles.profileName} numberOfLines={1}>
                            {fullName || 'Your Profile'}
                        </Text>
                        {!!email && (
                            <Text style={styles.profileEmail} numberOfLines={1}>
                                {email}
                            </Text>
                        )}
                    </View>
                    {hasPremium && (
                        <View style={styles.proBadge}>
                            <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                    )}
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    {renderSettingItem(settingsOptions[0], 0)}
                    {renderSettingItem(settingsOptions[1], 1)}
                </View>

                {/* Goals Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Goal adjustments</Text>
                    {renderSettingItem(settingsOptions[2], 2)}
                    {renderSettingItem(settingsOptions[3], 3)}
                    {renderSettingItem(settingsOptions[4], 4)}
                </View>

                {/* Customization Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Customization</Text>
                    {renderAppearanceItem()}
                    {renderSettingItem(settingsOptions[5], 5)}
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    {renderSettingItem(settingsOptions[6], 6)}
                    {renderSettingItem(settingsOptions[7], 7)}
                </View>
            </ScrollView>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        outerContainer: {
            flex: 1,
            backgroundColor: colors.background,
        },
        container: {
            flex: 1,
        },
        contentContainer: {
            paddingBottom: 40,
        },
        header: {
            paddingTop: 60,
            paddingBottom: 18,
            paddingHorizontal: 20,
        },
        title: {
            fontSize: 26,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 4,
            fontFamily: fonts.extrabold,
        },
        lastUpdated: {
            fontSize: 13,
            color: colors.labelMuted,
            marginTop: 2,
            fontFamily: fonts.regular,
        },
        profileCard: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 20,
            marginBottom: 24,
            padding: 16,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        avatar: {
            width: 52,
            height: 52,
            borderRadius: 26,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
        },
        avatarText: {
            fontSize: 20,
            color: '#FFFFFF',
            fontFamily: fonts.extrabold,
        },
        profileText: {
            flex: 1,
            marginRight: 10,
        },
        profileName: {
            fontSize: 17,
            color: colors.text,
            letterSpacing: -0.3,
            fontFamily: fonts.bold,
        },
        profileEmail: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 2,
            fontFamily: fonts.regular,
        },
        proBadge: {
            backgroundColor: colors.nutrition + '22',
            borderRadius: radius.chip,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        proBadgeText: {
            fontSize: 10,
            letterSpacing: 0.5,
            color: colors.nutritionInk,
            fontFamily: fonts.extrabold,
        },
        section: {
            marginBottom: 24,
            paddingHorizontal: 20,
        },
        sectionTitle: {
            fontSize: 13,
            color: colors.labelMuted,
            letterSpacing: 0.2,
            marginBottom: 10,
            marginLeft: 4,
            fontFamily: fonts.semibold,
        },
        settingItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 8,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: radius.iconTile,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
            backgroundColor: colors.surfaceInset,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        itemTextContainer: {
            flex: 1,
        },
        settingTitle: {
            fontSize: 16,
            color: colors.text,
            marginBottom: 2,
            letterSpacing: -0.2,
            fontFamily: fonts.semibold,
        },
        settingSubtitle: {
            fontSize: 13,
            color: colors.labelMuted,
            lineHeight: 17,
            fontFamily: fonts.regular,
        },
        trailingValue: {
            fontSize: 14,
            color: colors.textSecondary,
            marginLeft: 8,
            fontFamily: fonts.medium,
        },
    })
}
