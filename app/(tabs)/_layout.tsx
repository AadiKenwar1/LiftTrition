import { useColorScheme } from '@/components/ExpoComponents/useColorScheme'
import Colors from '@/constants/Colors'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Tabs } from 'expo-router'
import { ChartLine, Logs, Settings } from 'lucide-react-native'
import React from 'react'

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
    return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />
}

export default function TabLayout() {
    const colorScheme = useColorScheme()

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#121212',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Log',
                    tabBarIcon: ({ color }) => <Logs size={30} color={color} />,
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: 'Progress',
                    tabBarIcon: ({ color }) => <ChartLine size={30} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <Settings size={30} color={color} />,
                }}
            />
        </Tabs>
    )
}
