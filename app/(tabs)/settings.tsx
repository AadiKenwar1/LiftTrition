import { useAuth } from '@/context/AuthContext'
import { useBilling } from '@/context/BillingContext'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { powerSync } from '@/lib/powersync/system'
import { getPendingUploadEstimate } from '@/lib/powersync/uploadQueueStats'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Bell, ChevronRight, CreditCard, Dumbbell, FileText, FlaskConical, HelpCircle, Moon, Sun, Utensils, Wrench } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface SettingsOption {
    icon: React.ComponentType<any>
    title: string
    subtitle?: string
    onPress: () => void
}

// Uppercase avatar initials: up to two from the display name, else the email's first letter
function getInitials(fullName: string | undefined, email: string): string {
    if (fullName) {
        return fullName
            .split(/\s+/)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
    }
    return (email[0] || 'U').toUpperCase()
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
    const initials = getInitials(fullName, email)
    const isDark = colorScheme === 'dark'

    // Grouped per section (rendered by map) — never reference rows by array index; a removed row used to
    // shift every section and crash on the out-of-range read.
    const accountOptions: SettingsOption[] = [
        {
            icon: CreditCard,
            title: 'Subscription',
            subtitle: 'Manage your subscription plan',
            onPress: () => router.push('/settingsScreens/subscription'),
        },
    ]
    const goalOptions: SettingsOption[] = [
        {
            icon: Utensils,
            title: 'Adjust Nutrition',
            subtitle: 'Customize your nutrition goals',
            onPress: () => router.push('/settingsScreens/adjustNutrition/adjustNutrition1'),
        },
        {
            icon: Dumbbell,
            title: 'Adjust Training',
            subtitle: 'Personalize your workout plan',
            onPress: () => router.push('/settingsScreens/adjustTraining'),
        },
    ]
    const preferenceOptions: SettingsOption[] = [
        {
            icon: Bell,
            title: 'Notifications',
            subtitle: 'Meal reminders, streaks, and check-ins',
            onPress: () => router.push('/settingsScreens/notifications'),
        },
    ]
    const supportOptions: SettingsOption[] = [
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
        {
            icon: FileText,
            title: 'Terms and Privacy',
            subtitle: 'Read the terms of service and privacy policy',
            onPress: () => router.push('/settingsScreens/termsAndPrivacy'),
        },
    ]

    const renderSettingItem = (option: SettingsOption) => {
        const Icon = option.icon
        return (
            <TouchableOpacity key={option.title} style={styles.settingItem} onPress={option.onPress} activeOpacity={0.5}>
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

    return (
        <View style={styles.outerContainer}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Settings</Text>
                        <Text style={styles.lastUpdated}>{syncStatusLine}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.themeToggle}
                        onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} theme`}
                    >
                        {isDark ? <Sun size={20} color={colors.text} strokeWidth={2.2} /> : <Moon size={20} color={colors.text} strokeWidth={2.2} />}
                    </TouchableOpacity>
                </View>

                {/* Profile card */}
                <TouchableOpacity onPress={() => router.push('/settingsScreens/profile')}>
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
                </TouchableOpacity>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Billing</Text>
                    {accountOptions.map(renderSettingItem)}
                </View>

                {/* Goals Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Goal adjustments</Text>
                    {goalOptions.map(renderSettingItem)}
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    {preferenceOptions.map(renderSettingItem)}
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    {supportOptions.map(renderSettingItem)}
                </View>

                {/* Developer Section — dev builds only */}
                {__DEV__ && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Developer</Text>
                        {renderSettingItem({ icon: Wrench, title: 'Dev Hub', subtitle: 'Chart & component test harness', onPress: () => router.push('/devTest' as never) })}
                        {renderSettingItem({ icon: FlaskConical, title: 'Dev Stats', subtitle: 'Live sync, auth & upload-queue diagnostics', onPress: () => router.push('/settingsScreens/devStatsModal') })}
                    </View>
                )}
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
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingTop: 60,
            paddingBottom: 18,
            paddingHorizontal: 20,
        },
        headerText: {
            flex: 1,
            marginRight: 12,
        },
        themeToggle: {
            width: 42,
            height: 42,
            borderRadius: radius.iconButton,
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            justifyContent: 'center',
            alignItems: 'center',
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
    })
}
