import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CustomHeaderProps {
    title: string
    showBack: boolean
}

export default function CustomHeader({ title, showBack }: CustomHeaderProps) {
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    return (
        <View style={styles.container}>
            <View style={styles.headerContent}>
                {showBack && (
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.5} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                )}
                {title && <Text style={styles.title}>{title}</Text>}
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            height: 100,
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.navBorder,
            flexDirection: 'row',
            position: 'relative',
        },
        headerContent: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 20,
        },
        backButton: {
            left: 0,
            padding: 8,
        },
        title: {
            fontSize: 20,
            color: colors.text,
            letterSpacing: 0.5,
            flex: 1,
            textAlign: 'center',
            fontFamily: fonts.semibold,
        },
    })
}
