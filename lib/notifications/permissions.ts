import * as Notifications from 'expo-notifications'

// Return true if the OS notification permission is currently granted.
export async function isPermissionGranted(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync()
    return status === 'granted'
}

// Prompt for notification permission and return whether it ended up granted.
export async function requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
    })
    return status === 'granted'
}
