import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { Dumbbell, Pencil } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface LogProps {
    text: string
    subtitle?: string
    imgSource?: number
    showImageFallback?: boolean
    wrapperHeight?: number
    textLines?: number
    onPress: () => void
    onEditPress: () => void
    onMenuPress: () => void
}

export default function Log({ text, subtitle, imgSource, showImageFallback = false, wrapperHeight = 96, textLines = 2, onPress, onEditPress, onMenuPress }: LogProps) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

    return (
        <TouchableOpacity onPress={onPress} onLongPress={onMenuPress} delayLongPress={300}>
            <View style={styles.outerwrapper}>
                <View style={[styles.wrapper, { height: wrapperHeight }]}>
                    <View style={styles.accentBar} />
                    <View style={styles.container}>
                        {(imgSource || showImageFallback) && (
                            <View style={styles.imageGlowRing}>
                                <View style={styles.imageCircle}>
                                    {imgSource ?
                                        <Image source={imgSource} style={styles.exerciseImage} contentFit="contain" cachePolicy="memory" transition={50} />
                                    :   <Dumbbell size={25} color={colors.text} strokeWidth={1.8} />}
                                </View>
                            </View>
                        )}

                        <View style={styles.content}>
                            <Text style={styles.text} numberOfLines={textLines}>
                                {text}
                            </Text>
                            {subtitle && (
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>

                        <View style={styles.icons}>
                            <TouchableOpacity style={styles.iconButton} onPress={onEditPress} hitSlop={5} activeOpacity={0.5}>
                                <View style={styles.iconCircle}>
                                    <Pencil size={18} color={colors.workout} strokeWidth={2.5} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
}

function makeStyles(colors: Colors, isDark: boolean) {
    return StyleSheet.create({
        outerwrapper:
            isDark ?
                {}
            :   {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                },
        wrapper: {
            flexDirection: 'row',
            height: 96,
            marginVertical: 6,
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        accentBar: {
            width: 4,
            backgroundColor: colors.workout,
        },
        container: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 16,
        },
        content: {
            flex: 1,
            marginRight: 12,
            marginLeft: 4,
        },
        imageGlowRing: {
            width: 52,
            height: 52,
            borderRadius: 26,
            marginRight: 10,
            flexShrink: 0,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.workout,
        },
        imageCircle: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        },
        exerciseImage: {
            width: 36,
            height: 36,
            tintColor: colors.text,
        },
        icons: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        iconButton: {
            padding: 2,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: radius.iconButton,
            backgroundColor: colors.iconChipBg,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.workout + '66',
        },
        text: {
            fontSize: 17,
            color: colors.text,
            letterSpacing: -0.3,
            fontFamily: fonts.bold,
        },
        subtitle: {
            fontSize: 13,
            color: colors.labelMuted,
            marginTop: 4,
            fontFamily: fonts.regular,
        },
    })
}
