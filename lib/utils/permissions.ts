import { Linking } from 'react-native'

export function nextPermissionAction(p: { canAskAgain: boolean }): 'request' | 'settings' {
    return p.canAskAgain ? 'request' : 'settings'
}

export function openAppSettings(): void {
    void Linking.openSettings()
}
