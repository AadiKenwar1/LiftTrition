import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { Link, Stack } from 'expo-router'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function NotFoundScreen() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <Text style={styles.title}>This screen doesn't exist.</Text>

                <Link href="/" style={styles.link}>
                    <Text style={styles.linkText}>Go to home screen!</Text>
                </Link>
            </View>
        </>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backgroundColor: colors.background,
        },
        title: {
            fontSize: 20,
            fontFamily: fonts.semibold,
            color: colors.text,
        },
        link: {
            marginTop: 15,
            paddingVertical: 15,
        },
        linkText: {
            fontSize: 14,
            fontFamily: fonts.semibold,
            color: colors.workoutInk,
        },
    })
}
