import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import EditHeightModal from '@/components/NeutralComponents/EditHeightModal'
import { useAuth } from '@/context/AuthContext'
import { forceSignOut, isUploadFlushTimeoutError } from '@/context/AuthContext/functions/accountFunctions'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { inchesToFeetInches } from '@/lib/utils/unitConversions'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { LogOut, Pencil, Trash2 } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ProfileScreen() {
    const [signOutLoading, setSignOutLoading] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    // Flag to show/hide Apple Account section (for testing)
    const SHOW_APPLE_ACCOUNT = false

    const { user, signOut, deleteAccount } = useAuth()
    const { settings, setSettings, calculateMacros } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [editingKind, setEditingKind] = useState<MacroGoalKind | null>(null)
    const [editingHeight, setEditingHeight] = useState(false)

    function macroValue(kind: MacroGoalKind): number {
        switch (kind) {
            case 'calories':
                return settings.calorieGoal
            case 'protein':
                return settings.proteinGoal
            case 'carbs':
                return settings.carbsGoal
            case 'fats':
                return settings.fatsGoal
        }
    }

    function handleSaveMacro(value: number) {
        if (!editingKind) return
        if (editingKind === 'calories') setSettings({ ...settings, calorieGoal: value })
        else if (editingKind === 'protein') setSettings({ ...settings, proteinGoal: value })
        else if (editingKind === 'carbs') setSettings({ ...settings, carbsGoal: value })
        else setSettings({ ...settings, fatsGoal: value })
    }

    function handleSaveHeight(totalHeight: number) {
        const updatedSettings = { ...settings, height: totalHeight }
        const macros = calculateMacros(updatedSettings, settings.unitSystem === 'imperial')
        setSettings({
            ...updatedSettings,
            calorieGoal: macros.calResult,
            proteinGoal: macros.proteinGrams,
            carbsGoal: macros.carbGrams,
            fatsGoal: macros.fatGrams,
        })
    }

    const router = useRouter()

    const calculateAge = (birthDate: Date): number => {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }

        return age
    }

    const formatActivityLevel = (level: string) => {
        const map: Record<string, string> = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', gymrat: 'Gym Rat' }
        return map[level] || level
    }

    const formatGoalType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1)
    }

    const handleSignOut = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    setSignOutLoading(true)
                    try {
                        await signOut()
                    } catch (error: unknown) {
                        if (isUploadFlushTimeoutError(error)) {
                            Alert.alert('Still syncing', "We're still uploading your data. You can wait and try again, or force sign out (unsynced data may be lost).", [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Force sign out',
                                    style: 'destructive',
                                    onPress: async () => {
                                        setSignOutLoading(true)
                                        try {
                                            await forceSignOut()
                                        } catch (e: unknown) {
                                            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to force sign out')
                                        } finally {
                                            setSignOutLoading(false)
                                        }
                                    },
                                },
                            ])
                        } else {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out')
                        }
                    } finally {
                        setSignOutLoading(false)
                    }
                },
            },
        ])
    }

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'Are you sure? This cannot be undone. All your data will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setDeleteLoading(true)
                    try {
                        await deleteAccount()
                    } catch (e) {
                        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete account.')
                    } finally {
                        setDeleteLoading(false)
                    }
                },
            },
        ])
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Icon */}
                <View style={styles.profileIconContainer}>
                    <LinearGradient colors={[colors.workoutGradient[0], colors.nutritionGradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileIcon}>
                        <MaterialCommunityIcons name="account" size={48} color="#fff" />
                    </LinearGradient>
                </View>

                {/* Apple Account Information Section */}
                {SHOW_APPLE_ACCOUNT && user && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Apple Account</Text>
                        <View style={styles.card}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{user.email || 'Not provided'}</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Full Name</Text>
                                <Text style={styles.infoValue}>{user.user_metadata?.full_name || 'Not provided'}</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>User ID</Text>
                                <Text style={[styles.infoValue, styles.userIdText]} numberOfLines={1} ellipsizeMode="middle">
                                    {user.id}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Provider</Text>
                                <Text style={styles.infoValue}>{user.app_metadata?.provider || 'Apple'}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Personal Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Age</Text>
                            <Text style={styles.infoValue}>{calculateAge(settings.birthDate)} years old</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Biological Sex</Text>
                            <Text style={styles.infoValue}>{settings.gender === 'male' ? 'Male' : 'Female'}</Text>
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.infoRow} onPress={() => setEditingHeight(true)} activeOpacity={0.7}>
                            <Text style={styles.infoLabel}>Height</Text>
                            <View style={styles.editRow}>
                                <Text style={styles.infoValue}>
                                    {settings.unitSystem === 'imperial' ?
                                        (() => {
                                            const { feet, inches } = inchesToFeetInches(settings.height)
                                            return `${feet}'${inches}"`
                                        })()
                                    :   `${settings.height} cm`}
                                </Text>
                                <Pencil size={14} color={colors.textMuted} strokeWidth={2} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/nutritionScreens/updateBWModal')} activeOpacity={0.7}>
                            <Text style={styles.infoLabel}>Weight</Text>
                            <View style={styles.editRow}>
                                <Text style={styles.infoValue}>
                                    {settings.bodyWeight} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                                </Text>
                                <Pencil size={14} color={colors.textMuted} strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Fitness Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fitness Information</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/settingsScreens/adjustTraining')} activeOpacity={0.7}>
                            <Text style={styles.infoLabel}>Activity Level</Text>
                            <View style={styles.editRow}>
                                <Text style={styles.infoValue}>{formatActivityLevel(settings.activityLevel)}</Text>
                                <Pencil size={14} color={colors.textMuted} strokeWidth={2} />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/settingsScreens/adjustNutrition/adjustNutrition1')} activeOpacity={0.7}>
                            <Text style={styles.infoLabel}>Goal</Text>
                            <View style={styles.editRow}>
                                <Text style={styles.infoValue}>{formatGoalType(settings.goalType)} Weight</Text>
                                <Pencil size={14} color={colors.textMuted} strokeWidth={2} />
                            </View>
                        </TouchableOpacity>

                        {settings.goalType !== 'maintain' && (
                            <>
                                <View style={styles.divider} />

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Target Weight</Text>
                                    <Text style={styles.infoValue}>
                                        {settings.goalWeight} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                                    </Text>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Goal Pace</Text>
                                    <Text style={styles.infoValue}>
                                        {settings.goalPace.toFixed(1)} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}/week
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Nutrition Goals Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nutrition Goals</Text>
                    <View style={styles.card}>
                        {[
                            { kind: 'calories' as MacroGoalKind, label: 'Calories', value: `${settings.calorieGoal} cal` },
                            { kind: 'protein' as MacroGoalKind, label: 'Protein', value: `${settings.proteinGoal}g` },
                            { kind: 'carbs' as MacroGoalKind, label: 'Carbs', value: `${settings.carbsGoal}g` },
                            { kind: 'fats' as MacroGoalKind, label: 'Fats', value: `${settings.fatsGoal}g` },
                        ].map(({ kind, label, value }, i, arr) => (
                            <View key={kind}>
                                <TouchableOpacity style={styles.infoRow} onPress={() => setEditingKind(kind)} activeOpacity={0.7}>
                                    <Text style={styles.infoLabel}>{label}</Text>
                                    <View style={styles.editRow}>
                                        <Text style={styles.infoValue}>{value}</Text>
                                        <Pencil size={14} color={colors.textMuted} strokeWidth={2} />
                                    </View>
                                </TouchableOpacity>
                                {i < arr.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <TouchableOpacity style={[styles.signOutButton, signOutLoading && styles.buttonDisabled]} onPress={handleSignOut} activeOpacity={0.5} disabled={signOutLoading || deleteLoading}>
                        <LogOut size={20} color={colors.text} strokeWidth={2} />
                        <Text style={styles.signOutText}>{signOutLoading ? 'Signing out...' : 'Sign Out'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.deleteButton, deleteLoading && styles.buttonDisabled]} onPress={handleDeleteAccount} activeOpacity={0.5} disabled={signOutLoading || deleteLoading}>
                        <Trash2 size={20} color={colors.destructive} strokeWidth={2} />
                        <Text style={styles.deleteText}>{deleteLoading ? 'Deleting account...' : 'Delete Account'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <EditMacroGoalModal visible={editingKind != null} kind={editingKind} initialValue={editingKind != null ? macroValue(editingKind) : 0} onDismiss={() => setEditingKind(null)} onSave={handleSaveMacro} />
            <EditHeightModal visible={editingHeight} unitSystem={settings.unitSystem as 'imperial' | 'metric'} initialHeight={settings.height} currentWeight={settings.bodyWeight} onDismiss={() => setEditingHeight(false)} onSave={handleSaveHeight} />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollView: { flex: 1 },
        scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
        profileIconContainer: { alignItems: 'center', marginBottom: 24 },
        profileIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
        section: { marginBottom: 24 },
        sectionTitle: { fontSize: 18, color: colors.text, marginBottom: 12, paddingLeft: 4, letterSpacing: -0.5, fontFamily: fonts.semibold },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
        editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        infoLabel: { fontSize: 15, color: colors.textSecondary, letterSpacing: -0.5, fontFamily: fonts.semibold },
        infoValue: { fontSize: 15, color: colors.text, letterSpacing: -0.5, fontFamily: fonts.semibold },
        userIdText: { maxWidth: '60%', fontFamily: 'monospace' },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
        actionSection: { marginTop: 0, gap: 12 },
        buttonDisabled: { opacity: 0.6 },
        signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 56, backgroundColor: colors.surface, borderRadius: radius.cardLg, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        signOutText: { fontSize: 17, color: colors.text, letterSpacing: -0.5, fontFamily: fonts.semibold },
        deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 56, backgroundColor: colors.destructive + '1A', borderRadius: radius.cardLg, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.destructive + '4D' },
        deleteText: { fontSize: 17, color: colors.destructive, letterSpacing: -0.5, fontFamily: fonts.semibold },
    })
}
