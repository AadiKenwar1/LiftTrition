import { fonts, useColors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import { Tabs } from 'expo-router'
import { ChartLine, Logs, Settings } from 'lucide-react-native'
import React from 'react'
import { StyleSheet } from 'react-native'

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
export default function TabLayout() {
    const colors = useColors()
    const { mode } = useSettings()
    const accent = mode ? colors.workout : colors.nutrition

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.navBorder,
                    borderTopWidth: StyleSheet.hairlineWidth,
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
                    tabBarActiveTintColor: colors.text,
                    tabBarIcon: ({ color }) => <Settings size={30} color={color} />,
                }}
            />
        </Tabs>
    )
}
