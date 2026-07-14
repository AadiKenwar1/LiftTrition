import { Alert } from 'react-native'

type ConfirmDeleteOptions = {
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
}

export function confirmDelete({ title, message, confirmText = 'Delete', onConfirm }: ConfirmDeleteOptions) {
    Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: onConfirm },
    ])
}
