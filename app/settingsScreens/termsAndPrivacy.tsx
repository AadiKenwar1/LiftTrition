import TermsAndPrivacyContent from '@/components/NeutralComponents/TermsAndPrivacyContent'
import { useColors } from '@/context/ThemeContext'
import { View } from 'react-native'

export default function TermsAndPrivacyScreen() {
    const colors = useColors()
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <TermsAndPrivacyContent />
        </View>
    )
}
