import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Asset } from 'expo-asset'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Field, Segmented } from './DevControls'

const DELAYS = [
    { label: '3s', value: '3000' },
    { label: '8s', value: '8000' },
    { label: '15s', value: '15000' },
]

export default function ScanCancelTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const [delayMs, setDelayMs] = useState('8000')
    const [outcome, setOutcome] = useState<'success' | 'fail'>('success')

    async function launch() {
        try {
            const asset = Asset.fromModule(require('../../assets/devTest/meal.jpg'))
            await asset.downloadAsync()
            if (!asset.localUri) throw new Error('no local uri')
            router.push({
                pathname: '/nutritionScreens/analyzingModal',
                params: { photoUri: asset.localUri, mode: 'meal', devFakeMs: delayMs, devFakeOutcome: outcome },
            })
        } catch {
            Alert.alert('Error', 'Could not load the sample image')
        }
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Text style={styles.note}>Launches the real analyzing modal with a fake analysis — no API call, nothing saved.</Text>
            <Field label="Fake delay">
                <Segmented options={DELAYS} value={delayMs} onChange={setDelayMs} />
            </Field>
            <Field label="Outcome">
                <Segmented<'success' | 'fail'>
                    options={[
                        { label: 'Success', value: 'success' },
                        { label: 'Fail', value: 'fail' },
                    ]}
                    value={outcome}
                    onChange={setOutcome}
                />
            </Field>
            <TouchableOpacity style={styles.runButton} onPress={launch} activeOpacity={0.7}>
                <Text style={styles.runButtonText}>Launch Analyzing Modal</Text>
            </TouchableOpacity>
            <Text style={styles.help}>
                • Swipe down mid-delay → you land back here, then NOTHING happens (no alert, no navigation jump). That silence is the fix.{'\n\n'}
                • Don't swipe, outcome Success → dismisses all the way to the tabs (production success behavior — it pops the dev screens too).{'\n\n'}
                • Don't swipe, outcome Fail → failure alert appears ON the modal with Try Again / Cancel.
            </Text>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        note: { fontFamily: fonts.regular, fontSize: 13, color: colors.labelMuted, marginBottom: 16 },
        runButton: {
            backgroundColor: colors.nutrition,
            borderRadius: radius.card,
            paddingVertical: 13,
            alignItems: 'center',
            justifyContent: 'center',
        },
        runButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
        help: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 20, lineHeight: 19 },
    })
}
