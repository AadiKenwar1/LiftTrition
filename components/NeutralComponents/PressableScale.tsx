import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

/**
 * Shared press-scale wrapper — subtle 0.96 scale on press, driven by reanimated transform only (no layout
 * shift). Drop-in replacement for TouchableOpacity where a tactile press is wanted.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface PressableScaleProps extends PressableProps {
    style?: StyleProp<ViewStyle>
    scaleTo?: number
}

export default function PressableScale({ style, scaleTo = 0.96, children, ...rest }: PressableScaleProps) {
    const scale = useSharedValue(1)
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

    return (
        <AnimatedPressable
            {...rest}
            onPressIn={(e) => {
                scale.value = withTiming(scaleTo, { duration: 90 })
                rest.onPressIn?.(e)
            }}
            onPressOut={(e) => {
                scale.value = withTiming(1, { duration: 120 })
                rest.onPressOut?.(e)
            }}
            style={[style, animatedStyle]}
        >
            {children as React.ReactNode}
        </AnimatedPressable>
    )
}
