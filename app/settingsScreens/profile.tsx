import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useRouter } from 'expo-router'
import { LogOut, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ProfileScreen() {
    const [signOutLoading, setSignOutLoading] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    // Flag to show/hide Apple Account section (for testing)
    const SHOW_APPLE_ACCOUNT = false

    const { user, signOut, deleteAccount } = useAuth()
    const { settings, mode } = useSettings()
    const accent = 'white'

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
                        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out')
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
                    <View style={[styles.profileIcon, { borderColor: accent }]}>
                        <MaterialCommunityIcons name="account" size={48} color={accent} />
                    </View>
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

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Height</Text>
                            <Text style={styles.infoValue}>
                                {settings.height} {settings.unitSystem === 'imperial' ? 'in' : 'cm'}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Weight</Text>
                            <Text style={styles.infoValue}>
                                {settings.bodyWeight} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Fitness Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fitness Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Activity Level</Text>
                            <Text style={styles.infoValue}>{formatActivityLevel(settings.activityLevel)}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Goal</Text>
                            <Text style={styles.infoValue}>{formatGoalType(settings.goalType)} Weight</Text>
                        </View>

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
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Calories</Text>
                            <Text style={styles.infoValue}>{settings.calorieGoal} cal</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Protein</Text>
                            <Text style={styles.infoValue}>{settings.proteinGoal}g</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Carbs</Text>
                            <Text style={styles.infoValue}>{settings.carbsGoal}g</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fats</Text>
                            <Text style={styles.infoValue}>{settings.fatsGoal}g</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <TouchableOpacity style={[styles.signOutButton, signOutLoading && styles.buttonDisabled]} onPress={handleSignOut} activeOpacity={0.7} disabled={signOutLoading || deleteLoading}>
                        <LogOut size={20} color="#fff" strokeWidth={2} />
                        <Text style={styles.signOutText}>{signOutLoading ? 'Signing out...' : 'Sign Out'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.deleteButton, deleteLoading && styles.buttonDisabled]} onPress={handleDeleteAccount} activeOpacity={0.7} disabled={signOutLoading || deleteLoading}>
                        <Trash2 size={20} color="#FF6B6B" strokeWidth={2} />
                        <Text style={styles.deleteText}>{deleteLoading ? 'Deleting account...' : 'Delete Account'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#121212', borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, color: '#fff', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    placeholder: { width: 40 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    profileIconContainer: { alignItems: 'center', marginVertical: 24 },
    profileIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#282A2C', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, color: '#fff', marginBottom: 12, paddingLeft: 4, letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    card: { backgroundColor: '#282A2C', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2a2a2a' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    infoLabel: { fontSize: 15, color: '#aaa', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    infoValue: { fontSize: 15, color: '#fff', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    userIdText: { maxWidth: '60%', fontFamily: 'monospace' },
    divider: { height: 1, backgroundColor: '#2a2a2a' },
    actionSection: { marginTop: 16, gap: 12 },
    buttonDisabled: { opacity: 0.6 },
    signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 56, backgroundColor: '#2a2a2a', borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#3a3a3a' },
    signOutText: { fontSize: 17, color: '#fff', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 56, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.3)' },
    deleteText: { fontSize: 17, color: '#FF6B6B', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
})
