import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface PromptCardProps {
    icon: React.ComponentType<any>
    title: string
    message: string
    ctaLabel: string
    onPress: () => void
    onGoBack?: () => void
}

// Shared overlay prompt card (upsell / permission / settings) shown over any screen.
export default function PromptCard({ icon: Icon, title, message, ctaLabel, onPress, onGoBack }: PromptCardProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    return (
        <View style={styles.overlay}>
            <View style={styles.card}>
                <View style={styles.iconCircle}>
                    <Icon size={48} color={colors.nutrition} strokeWidth={2.5} />
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
                <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.ctaTouchable}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                        <Text style={styles.ctaText}>{ctaLabel}</Text>
                    </LinearGradient>
                </TouchableOpacity>
                {onGoBack && (
                    <TouchableOpacity onPress={onGoBack} style={styles.goBackButton} activeOpacity={0.5}>
                        <Text style={styles.goBackText}>Go Back</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
        },
        card: {
            width: '100%',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingVertical: 28,
            paddingHorizontal: 24,
        },
        iconCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
            marginBottom: 20,
        },
        title: {
            fontSize: 22,
            color: colors.text,
            marginBottom: 6,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        message: {
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        ctaTouchable: {
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
        },
        cta: {
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            fontSize: 17,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        goBackButton: {
            paddingVertical: 14,
            paddingHorizontal: 24,
            marginTop: 4,
        },
        goBackText: {
            fontSize: 16,
            color: colors.labelMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
