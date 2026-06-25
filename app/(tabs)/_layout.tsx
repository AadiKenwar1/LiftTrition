import { fonts, useColorScheme, useColors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import { Tabs } from 'expo-router'
import { ChartLine, Logs, Settings } from 'lucide-react-native'
import React from 'react'
import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// A dark "ink" tab bar grounds the otherwise very-light light theme; dark mode keeps its surface bar.
const INK = '#16171A'

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
export default function TabLayout() {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const insets = useSafeAreaInsets()
    const { mode } = useSettings()
    const accent = mode ? colors.workout : colors.nutrition

    // Tab bar is dark in both themes (light uses INK); tints below are tuned to read on it.
    const barBg = isDark ? colors.surface : INK
    const barBorder = isDark ? colors.navBorder : 'rgba(255,255,255,0.08)'
    const neutralActive = isDark ? colors.text : '#FFFFFF'

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
                tabBarStyle: {
                    backgroundColor: barBg,
                    borderTopColor: barBorder,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom,
                    paddingTop: 8,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Log',
                    tabBarActiveTintColor: accent,
                    tabBarIcon: ({ color }) => <Logs size={30} color={color} />,
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: 'Progress',
                    tabBarActiveTintColor: accent,
                    tabBarIcon: ({ color }) => <ChartLine size={30} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarActiveTintColor: neutralActive,
                    tabBarIcon: ({ color }) => <Settings size={30} color={color} />,
                }}
            />
        </Tabs>
    )
}
