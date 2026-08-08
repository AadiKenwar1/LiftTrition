import { useColors, type Colors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'
import { Dumbbell, Nut, UtensilsCrossed } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

const ICON_SIZE = 25
const ICON_STROKE = 2.5
// Breathing room between the safe-area edge and the tab icons.
const BAR_GAP = 0

// Top-nav mode switcher: a full-width bar of two tabs (Workout / Nutrition), the active one tinted its mode
// accent with an underline beneath it, sitting on the elevated navBar surface with a bottom divider.
export default function ModeSwitcher() {
    const { mode, setMode } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad(BAR_GAP)

    const renderTab = (isLift: boolean) => {
        const active = mode === isLift
        const accent = isLift ? colors.workout : colors.nutrition
        const Icon = isLift ? Dumbbell : UtensilsCrossed
        const tint = active ? accent : colors.tabInactive

        return (
            <Pressable style={styles.tab} onPress={() => setMode(isLift)}>
                <View style={styles.tabInner}>
                    <Icon size={ICON_SIZE} color={tint} strokeWidth={ICON_STROKE} style={isLift ? styles.dumbbellIcon : undefined} />
                </View>
                <View style={[styles.underline, { backgroundColor: active ? accent : 'transparent' }]} />
            </Pressable>
        )
    }

    return (
        <View style={[styles.header, { paddingTop: topPad }]}>
            <View style={styles.row}>
                {renderTab(true)}
                {renderTab(false)}
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        // Edge-to-edge nav bar: elevated surface + bottom divider so it reads as top-of-screen chrome. The
        // underline sits tight to the divider (tab-indicator look), so no paddingBottom/paddingHorizontal.
        header: {
            backgroundColor: colors.navBar,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
            zIndex: 100,
            // Soft drop shadow under the bar so it reads as raised chrome over the page.
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 6,
            shadowOpacity: 0.12,
            elevation: 6,
        },
        row: {
            flexDirection: 'row',
        },
        tab: {
            flex: 1,
            alignItems: 'center',
        },
        tabInner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop:12,
            paddingBottom:12
        },
        underline: {
            height: 3,
            width: '55%',
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
        },
        dumbbellIcon: {
            transform: [{ rotate: '45deg' }],
        },
    })
}
