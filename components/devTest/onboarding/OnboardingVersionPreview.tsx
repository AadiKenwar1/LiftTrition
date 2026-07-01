import { useLocalSearchParams } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { PAGES } from './registry'

/**
 * Dev-only full-screen preview of one onboarding version. Reached via
 * `/devTest/onboardingPreview?page=N&version=M`. No nav header (swipe back to the versions list).
 */
export default function OnboardingVersionPreview() {
    const { page, version } = useLocalSearchParams<{ page?: string; version?: string }>()
    const pIdx = Math.min(Math.max(0, Number(page) || 0), PAGES.length - 1)
    const versions = PAGES[pIdx].versions
    const vIdx = Math.min(Math.max(0, Number(version) || 0), Math.max(0, versions.length - 1))
    const Component = versions[vIdx]?.Component

    return <View style={styles.root}>{Component ? <Component /> : null}</View>
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
})
