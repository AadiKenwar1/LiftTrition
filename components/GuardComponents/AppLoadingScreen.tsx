import { logoForScheme } from '@/constants/assets'
import { fonts, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'

type Props = {
    message?: string
}

export function AppLoadingScreen({ message = 'Loading your profile...' }: Props) {
    const colors = useColors()
    const scheme = useColorScheme()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const rotation = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 2400,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start()
    }, [rotation])

    const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoCircle, { transform: [{ rotate: spin }] }]}>
                <Image
                    source={logoForScheme(scheme)}
                    style={styles.logo}
                    contentFit="contain"
                    priority="high"
                />
            </Animated.View>
            <Text style={styles.message}>{message}</Text>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
        },
        logoCircle: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            marginBottom: 24,
        },
        logo: {
            width: '75%',
            height: '75%',
        },
        message: {
            color: colors.textMuted,
            fontSize: 15,
            fontFamily: fonts.regular,
            letterSpacing: 0.1,
        },
    })
}
