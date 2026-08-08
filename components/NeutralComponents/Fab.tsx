import { useColors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import { Entypo } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'

interface FabProps {
    // Required props
    children: React.ReactNode
    // Optional props
}

function FloatingActionMenu({ children }: FabProps) {
    const { mode } = useSettings()
    const colors = useColors()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [buttonWidths, setButtonWidths] = useState<Record<number, number>>({})
    const [isInitialized, setIsInitialized] = useState<boolean>(false)

    // Store an Animated.Value for each child
    const opacityValues = useRef<Animated.Value[]>([])

    // Initialize the animated values based on number of children
    useEffect(() => {
        const childrenCount = React.Children.count(children)

        // Only create new animated values if we don't have enough
        while (opacityValues.current.length < childrenCount) {
            opacityValues.current.push(new Animated.Value(0))
        }

        // Trim excess values if we have too many
        if (opacityValues.current.length > childrenCount) {
            opacityValues.current = opacityValues.current.slice(0, childrenCount)
        }

        // Mark as initialized after a brief delay to ensure smooth initial state
        if (!isInitialized) {
            setTimeout(() => setIsInitialized(true), 50)
        }
    }, [children, isInitialized])

    const toggleMenu = () => setIsOpen((prev) => !prev)

    useEffect(() => {
        // Only animate if we have animated values and are initialized
        if (opacityValues.current.length > 0 && isInitialized) {
            const anims = opacityValues.current.map((opacity) =>
                Animated.timing(opacity, {
                    toValue: isOpen ? 1 : 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            )
            Animated.parallel(anims).start()
        }
    }, [isOpen, isInitialized])

    const handleLayout = (e: LayoutChangeEvent, index: number) => {
        const width = e.nativeEvent.layout.width
        setButtonWidths((prev) => ({ ...prev, [index]: width }))
    }

    return (
        <View style={styles.container}>
            {React.Children.map(children, (child, index) => {
                const width = buttonWidths[index] || 60
                const xOffset = (80 - width) / 2
                const verticalSpacing = 67 // consistent spacing between buttons
                const bottomOffset = 20 + (index + 1) * verticalSpacing

                // Ensure we have an animated value for this index
                const opacityValue = opacityValues.current[index] || new Animated.Value(0)

                return (
                    <Animated.View
                        key={index}
                        style={{
                            position: 'absolute',
                            bottom: bottomOffset,
                            right: xOffset,
                            opacity: opacityValue,
                        }}
                        onLayout={(e) => handleLayout(e, index)}
                        pointerEvents={isOpen ? 'auto' : 'none'}
                    >
                        {child}
                    </Animated.View>
                )
            })}

            <Pressable style={[styles.fab, { shadowColor: mode ? colors.workout : colors.nutrition }]} onPress={toggleMenu}>
                <LinearGradient colors={mode ? colors.workoutGradient : colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientFab}>
                    <Entypo name={isOpen ? 'cross' : 'dots-three-vertical'} size={28} color="white" />
                </LinearGradient>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 15,
        alignItems: 'flex-end',
        zIndex: 10,
        bottom: 20,
    },
    fab: {
        width: 80,
        height: 80,
        borderRadius: 40,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 9,
        elevation: 8,
    },
    gradientFab: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

export default FloatingActionMenu
