import { fonts, useColors, type Colors } from '@/context/ThemeContext';
import { FileText } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionText}>{children}</Text>
        </View>
    )
}

function BulletList({ items }: { items: string[] }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.bulletList}>
            {items.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                </View>
            ))}
        </View>
    )
}

export default function TermsAndPrivacyContent() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <FileText size={40} color={colors.text} strokeWidth={2} />
                </View>
                <Text style={styles.title}>Terms of Service & Privacy Policy</Text>
                <Text style={styles.lastUpdated}>Last updated: March 2025</Text>
            </View>

            <Section title="1. Acceptance of Terms">By downloading, accessing, or using Plates ("the App"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the App.</Section>

            <Section title="2. Eligibility and Minimum Age">You must be at least 13 years old to use the App. If you are under 18, you should have your parent or guardian review these terms and help you create an account. By using the App, you represent that you meet these requirements.</Section>

            <Section title="3. Description of Service">Plates is a fitness and nutrition tracking app that helps you:</Section>
            <BulletList items={['Log and track workouts', 'Track nutrition and calories', 'Monitor body weight progress', 'Set and adjust nutrition goals based on your profile', 'Use AI to analyze food (premium)', 'Access a food database (premium)']} />

            <Section title="4. Account and Data">To use the App, you create an account via Apple Sign In. We collect and store:</Section>
            <BulletList items={['Personal information: age, biological sex, height, weight, birth date', 'Fitness data: workout logs, nutrition entries, body weight history', 'Settings: activity level, goals, macro targets', 'Account credentials (managed by Apple)']} />

            <Section title="5. How We Use Your Data">Your data is used to provide the App's features, including personalized nutrition calculations, workout tracking, and progress visualization. We use secure cloud storage (Supabase) and sync your data across devices. We do not sell your personal data to third parties.</Section>

            <Section title="6. AI and Third-Party Services">Premium features may use OpenAI for food analysis. Food data may be sourced from third-party databases. Data sent to these services is used only to fulfill the requested feature. Please refer to OpenAI's and other providers' privacy policies for additional details.</Section>

            <Section title="7. Subscriptions">PLATES offers optional premium subscriptions (e.g., AI features, food database access). Subscriptions are processed through RevenueCat and Apple. You can manage or cancel your subscription in your device settings.</Section>

            <Section title="8. Data Security">We use industry-standard security practices. Your data is stored in encrypted form and transmitted over secure connections. You are responsible for keeping your account credentials secure.</Section>

            <Section title="9. Account Deletion">You may delete your account at any time from Profile in Settings. Deleting your account permanently removes all your data from our systems, including workout logs, nutrition entries, and profile information. This action cannot be undone.</Section>

            <Section title="10. Disclaimer">PLATES provides fitness and nutrition information for general guidance only. It is not a substitute for professional medical, nutritional, or fitness advice. Always consult a healthcare provider before making significant changes to your diet or exercise routine.</Section>

            <Section title="11. Changes to This Policy">These Terms and Privacy Policy may change from time to time. We will update the "Last updated" date when we do. Your continued use of the App after any changes means you accept the updated terms. If you do not agree to the changes, you should stop using the App and delete your account.</Section>

            <Section title="12. Contact">For questions about these terms or your privacy, contact us through the Support option in Settings.</Section>

            <View style={styles.footer}>
                <Text style={styles.footerText}>© 2026 LiftTrition. All rights reserved.</Text>
            </View>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: 20, paddingBottom: 40 },
        header: {
            alignItems: 'center',
            marginBottom: 24,
            paddingTop: 8,
        },
        iconCircle: {
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.iconCircleBg,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 2,
            borderColor: colors.text,
        },
        title: {
            fontSize: 22,
            color: colors.text,
            fontFamily: fonts.semibold,
            textAlign: 'center',
            marginBottom: 4,
        },
        lastUpdated: {
            fontSize: 13,
            color: colors.textMuted,
            fontFamily: fonts.regular,
        },
        section: {
            marginBottom: 20,
        },
        sectionTitle: {
            fontSize: 16,
            fontFamily: fonts.semibold,
            marginBottom: 8,
            color: colors.text,
        },
        sectionText: {
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 22,
            fontFamily: fonts.regular,
        },
        bulletList: {
            marginBottom: 20,
            marginLeft: 8,
        },
        bulletRow: {
            flexDirection: 'row',
            marginBottom: 4,
        },
        bullet: {
            fontSize: 14,
            marginRight: 8,
            color: colors.text,
        },
        bulletText: {
            flex: 1,
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 22,
            fontFamily: fonts.regular,
        },
        footer: {
            marginTop: 24,
            paddingTop: 24,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.hairline,
        },
        footerText: {
            fontSize: 12,
            color: colors.textMuted,
            textAlign: 'center',
            fontFamily: fonts.regular,
        },
    })
}
